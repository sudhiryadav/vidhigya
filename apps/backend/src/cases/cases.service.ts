import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CaseCategory,
  CasePriority,
  CaseStatus,
  NoteType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCaseDto {
  caseNumber: string;
  title: string;
  description: string;
  category: CaseCategory;
  priority: CasePriority;
  courtId?: string;
  judge?: string;
  opposingParty?: string;
  opposingLawyer?: string;
  filingDate?: Date | string | null;
  nextHearingDate?: Date | string | null;
  estimatedCompletionDate?: Date | string | null;
  clientId: string;
  assignedLawyerId: string;
  practiceId: string;
}

export interface UpdateCaseDto {
  title?: string;
  description?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  category?: CaseCategory;
  courtId?: string;
  judge?: string;
  opposingParty?: string;
  opposingLawyer?: string;
  filingDate?: Date | string | null;
  nextHearingDate?: Date | string | null;
  estimatedCompletionDate?: Date | string | null;
  assignedLawyerId?: string;
}

export interface CreateCaseNoteDto {
  content: string;
  type: NoteType;
  caseId: string;
  userId: string;
  practiceId: string;
}

export interface UpdateCaseNoteDto {
  content?: string;
  type?: NoteType;
}

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  // Helper method to validate practice access
  private async validatePracticeAccess(userId: string, practiceId: string) {
    // Check if user is a super admin (bypass practice check)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user is a member of the practice
    const practiceMember = await this.prisma.practiceMember.findFirst({
      where: {
        practiceId,
        userId,
        isActive: true,
      },
    });

    if (!practiceMember) {
      throw new ForbiddenException('Access denied to this practice');
    }

    return true;
  }

  /**
   * Create a new legal case
   * @param createCaseDto - Case creation data
   * @returns Created case with related data
   */
  async create(createCaseDto: CreateCaseDto) {
    // Validate practice access
    await this.validatePracticeAccess(
      createCaseDto.assignedLawyerId,
      createCaseDto.practiceId,
    );

    // Check if case number already exists
    const existingCase = await this.prisma.legalCase.findUnique({
      where: { caseNumber: createCaseDto.caseNumber },
    });

    if (existingCase) {
      throw new BadRequestException('Case number already exists');
    }

    /**
     * Helper function to clean and validate date fields
     * Converts empty strings to null and validates date strings
     * @param dateValue - Date value to clean (string, Date, or null)
     * @returns Cleaned Date object or null
     */
    const cleanDateField = (dateValue: any): Date | null => {
      if (dateValue === '' || dateValue === null || dateValue === undefined) {
        return null;
      }
      if (typeof dateValue === 'string') {
        if (dateValue.trim() === '') {
          return null;
        }
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          console.warn(
            `Invalid date string received: "${dateValue}" - converting to null`,
          );
          return null;
        }
        return parsed;
      }
      if (dateValue instanceof Date) {
        return dateValue;
      }
      console.warn(
        `Unexpected date value type: ${typeof dateValue} - converting to null`,
      );
      return null;
    };

    const cleanedData = {
      caseNumber: createCaseDto.caseNumber,
      title: createCaseDto.title,
      description: createCaseDto.description,
      category: createCaseDto.category,
      priority: createCaseDto.priority,
      judge: createCaseDto.judge || null,
      opposingParty: createCaseDto.opposingParty || null,
      opposingLawyer: createCaseDto.opposingLawyer || null,
      filingDate: cleanDateField(createCaseDto.filingDate),
      nextHearingDate: cleanDateField(createCaseDto.nextHearingDate),
      estimatedCompletionDate: cleanDateField(
        createCaseDto.estimatedCompletionDate,
      ),
      client: {
        connect: { id: createCaseDto.clientId },
      },
      practice: {
        connect: { id: createCaseDto.practiceId },
      },
      assignedLawyer: {
        connect: { id: createCaseDto.assignedLawyerId },
      },
      court: createCaseDto.courtId
        ? {
            connect: { id: createCaseDto.courtId },
          }
        : undefined,
    };

    // Validate enum fields
    if (!Object.values(CaseCategory).includes(cleanedData.category)) {
      console.warn(`Invalid category received: ${cleanedData.category}`);
      throw new BadRequestException(
        `Invalid category: ${cleanedData.category}`,
      );
    }
    if (!Object.values(CasePriority).includes(cleanedData.priority)) {
      console.warn(`Invalid priority received: ${cleanedData.priority}`);
      throw new BadRequestException(
        `Invalid priority: ${cleanedData.priority}`,
      );
    }

    return this.prisma.legalCase.create({
      data: cleanedData,
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            createdAt: true,
          },
        },
        notes: {
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        billingRecords: {
          select: {
            id: true,
            amount: true,
            description: true,
            status: true,
            dueDate: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, query: Record<string, unknown> = {}) {
    // Get user's role and practice information
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const where: Record<string, unknown> = {};

    // SUPER_ADMIN can see all cases
    if (user.role === 'SUPER_ADMIN') {
      // No additional filters needed
    }
    // ADMIN can see all cases from all practices (read-only access)
    else if (user.role === 'ADMIN') {
      // No additional filters needed - admin can see all cases
    }
    // LAWYER, ASSOCIATE, and PARALEGAL can see cases from their practices
    else if (['LAWYER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)) {
      const practiceIds = user.practices.map((p) => p.practiceId);
      if (practiceIds.length > 0) {
        where.practiceId = { in: practiceIds };
      } else {
        // If no practices, they can only see their own cases
        where.OR = [{ assignedLawyerId: userId }, { clientId: userId }];
      }
    }
    // CLIENT can only see their own cases
    else {
      where.clientId = userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    const cases = await this.prisma.legalCase.findMany({
      where,
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return cases;
  }

  async findOne(id: string, userId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id,
      },
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            state: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
            uploadedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        notes: {
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        billingRecords: {
          select: {
            id: true,
            amount: true,
            description: true,
            billType: true,
            status: true,
            dueDate: true,
            paidDate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, legalCase.practiceId);

    return legalCase;
  }

  /**
   * Update an existing legal case
   * @param id - Case ID
   * @param updateCaseDto - Case update data
   * @param userId - User ID performing the update
   * @returns Updated case with related data
   */
  async update(id: string, updateCaseDto: UpdateCaseDto, userId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id,
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, legalCase.practiceId);

    // Clean up date fields - convert empty strings to null and validate date strings
    const cleanedData = { ...updateCaseDto };

    /**
     * Helper function to clean and validate date fields
     * Converts empty strings to null and validates date strings
     * @param dateValue - Date value to clean (string, Date, or null)
     * @returns Cleaned Date object or null
     */
    const cleanDateField = (dateValue: any): Date | null => {
      if (dateValue === '' || dateValue === null || dateValue === undefined) {
        return null;
      }
      if (typeof dateValue === 'string') {
        if (dateValue.trim() === '') {
          return null;
        }
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          console.warn(
            `Invalid date string received: "${dateValue}" - converting to null`,
          );
          return null;
        }
        return parsed;
      }
      if (dateValue instanceof Date) {
        return dateValue;
      }
      console.warn(
        `Unexpected date value type: ${typeof dateValue} - converting to null`,
      );
      return null;
    };

    cleanedData.filingDate = cleanDateField(cleanedData.filingDate);
    cleanedData.nextHearingDate = cleanDateField(cleanedData.nextHearingDate);
    cleanedData.estimatedCompletionDate = cleanDateField(
      cleanedData.estimatedCompletionDate,
    );

    // Validate enum fields
    if (
      cleanedData.category &&
      !Object.values(CaseCategory).includes(
        cleanedData.category as CaseCategory,
      )
    ) {
      console.warn(`Invalid category received: ${cleanedData.category}`);
      throw new BadRequestException(
        `Invalid category: ${cleanedData.category}`,
      );
    }
    if (
      cleanedData.priority &&
      !Object.values(CasePriority).includes(
        cleanedData.priority as CasePriority,
      )
    ) {
      console.warn(`Invalid priority received: ${cleanedData.priority}`);
      throw new BadRequestException(
        `Invalid priority: ${cleanedData.priority}`,
      );
    }
    if (
      cleanedData.status &&
      !Object.values(CaseStatus).includes(cleanedData.status as CaseStatus)
    ) {
      console.warn(`Invalid status received: ${cleanedData.status}`);
      throw new BadRequestException(`Invalid status: ${cleanedData.status}`);
    }

    return this.prisma.legalCase.update({
      where: { id },
      data: cleanedData,
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id,
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, legalCase.practiceId);

    return this.prisma.legalCase.delete({
      where: { id },
    });
  }

  // Case Notes Management
  async createNote(createNoteDto: CreateCaseNoteDto) {
    // Validate practice access
    await this.validatePracticeAccess(
      createNoteDto.userId,
      createNoteDto.practiceId,
    );

    return this.prisma.caseNote.create({
      data: createNoteDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findCaseNotes(caseId: string, userId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id: caseId,
        assignedLawyerId: userId,
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    return this.prisma.caseNote.findMany({
      where: { caseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateNote(
    noteId: string,
    updateNoteDto: UpdateCaseNoteDto,
    userId: string,
  ) {
    const note = await this.prisma.caseNote.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return this.prisma.caseNote.update({
      where: { id: noteId },
      data: updateNoteDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async removeNote(noteId: string, userId: string) {
    const note = await this.prisma.caseNote.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return this.prisma.caseNote.delete({
      where: { id: noteId },
    });
  }

  // Client Management
  async getClients(lawyerId: string) {
    // Check if user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: lawyerId },
      select: { role: true },
    });

    const where: {
      isActive: boolean;
      cases?: {
        some: {
          assignedLawyerId: string;
        };
      };
    } = {
      isActive: true,
    };

    // For non-admin users, only show clients with cases assigned to them
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      where.cases = {
        some: {
          assignedLawyerId: lawyerId,
        },
      };
    }

    return this.prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        cases: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            category: true,
            priority: true,
            nextHearingDate: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getClientDetails(clientId: string, lawyerId: string) {
    // Check if user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: lawyerId },
      select: { role: true },
    });

    const where: {
      id: string;
      isActive: boolean;
      cases?: {
        some: {
          assignedLawyerId: string;
        };
      };
    } = {
      id: clientId,
      isActive: true,
    };

    // For non-admin users, only show clients with cases assigned to them
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      where.cases = {
        some: {
          assignedLawyerId: lawyerId,
        },
      };
    }

    const client = await this.prisma.client.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        cases: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            description: true,
            status: true,
            category: true,
            priority: true,
            court: true,
            judge: true,
            filingDate: true,
            nextHearingDate: true,
            estimatedCompletionDate: true,
            documents: {
              select: {
                id: true,
                title: true,
                category: true,
                status: true,
                createdAt: true,
              },
            },
            billingRecords: {
              select: {
                id: true,
                amount: true,
                description: true,
                status: true,
                dueDate: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  // Dashboard Statistics
  async getDashboardStats(lawyerId: string) {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCases,
      activeCases,
      pendingCases,
      closedCases,
      totalClients,
      totalDocuments,
      totalBills,
      upcomingHearings,
      overdueBills,
      // Month-over-month comparisons
      lastMonthCases,
      newCasesThisMonth,
      newClientsThisMonth,
    ] = await Promise.all([
      this.prisma.legalCase.count({
        where: { assignedLawyerId: lawyerId },
      }),
      this.prisma.legalCase.count({
        where: {
          assignedLawyerId: lawyerId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.legalCase.count({
        where: {
          assignedLawyerId: lawyerId,
          status: 'PENDING',
        },
      }),
      this.prisma.legalCase.count({
        where: {
          assignedLawyerId: lawyerId,
          status: { in: ['CLOSED', 'ARCHIVED'] },
        },
      }),
      this.prisma.client.count({
        where: {
          isActive: true,
          cases: {
            some: {
              assignedLawyerId: lawyerId,
            },
          },
        },
      }),
      this.prisma.legalDocument.count({
        where: {
          case: {
            assignedLawyerId: lawyerId,
          },
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          case: {
            assignedLawyerId: lawyerId,
          },
        },
      }),
      this.prisma.legalCase.findMany({
        where: {
          assignedLawyerId: lawyerId,
          nextHearingDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
        select: {
          id: true,
          caseNumber: true,
          title: true,
          nextHearingDate: true,
          client: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          nextHearingDate: 'asc',
        },
        take: 5,
      }),
      this.prisma.billingRecord.count({
        where: {
          case: {
            assignedLawyerId: lawyerId,
          },
          status: 'PENDING',
          dueDate: {
            lt: new Date(),
          },
        },
      }),
      // Cases from last month
      this.prisma.legalCase.count({
        where: {
          assignedLawyerId: lawyerId,
          createdAt: {
            lt: thisMonth,
            gte: lastMonth,
          },
        },
      }),

      // New cases this month
      this.prisma.legalCase.count({
        where: {
          assignedLawyerId: lawyerId,
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
      // New clients this month
      this.prisma.client.count({
        where: {
          isActive: true,
          cases: {
            some: {
              assignedLawyerId: lawyerId,
              createdAt: {
                gte: thisMonth,
              },
            },
          },
        },
      }),
    ]);

    // Calculate percentage changes
    const caseChangePercent =
      lastMonthCases > 0
        ? Math.round(((totalCases - lastMonthCases) / lastMonthCases) * 100)
        : 0;

    return {
      totalCases,
      activeCases,
      pendingCases,
      closedCases,
      totalClients,
      totalDocuments,
      totalBills,
      upcomingHearings,
      overdueBills,
      // Month-over-month data
      caseChangePercent,
      newCasesThisMonth,
      newClientsThisMonth,
    };
  }

  // Practice-level Dashboard Statistics (for firm owners/admins)
  async getPracticeDashboardStats(userId: string) {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user's practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      throw new BadRequestException('User must be associated with a practice');
    }

    const practiceId = user.primaryPracticeId;

    const [
      totalCases,
      activeCases,
      pendingCases,
      closedCases,
      totalClients,
      totalDocuments,
      totalBills,
      upcomingHearings,
      overdueBills,
      // Month-over-month comparisons
      lastMonthCases,
      newCasesThisMonth,
      newClientsThisMonth,
    ] = await Promise.all([
      this.prisma.legalCase.count({
        where: { practiceId },
      }),
      this.prisma.legalCase.count({
        where: {
          practiceId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.legalCase.count({
        where: {
          practiceId,
          status: 'PENDING',
        },
      }),
      this.prisma.legalCase.count({
        where: {
          practiceId,
          status: { in: ['CLOSED', 'ARCHIVED'] },
        },
      }),
      this.prisma.client.count({
        where: {
          practiceId,
          isActive: true,
        },
      }),
      this.prisma.legalDocument.count({
        where: {
          case: {
            practiceId,
          },
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          case: {
            practiceId,
          },
        },
      }),
      this.prisma.legalCase.findMany({
        where: {
          practiceId,
          nextHearingDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
        select: {
          id: true,
          caseNumber: true,
          title: true,
          nextHearingDate: true,
          client: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          nextHearingDate: 'asc',
        },
        take: 5,
      }),
      this.prisma.billingRecord.count({
        where: {
          case: {
            practiceId,
          },
          status: 'PENDING',
          dueDate: {
            lt: new Date(),
          },
        },
      }),
      // Cases from last month
      this.prisma.legalCase.count({
        where: {
          practiceId,
          createdAt: {
            lt: thisMonth,
            gte: lastMonth,
          },
        },
      }),
      // New cases this month
      this.prisma.legalCase.count({
        where: {
          practiceId,
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
      // New clients this month
      this.prisma.client.count({
        where: {
          practiceId,
          isActive: true,
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
    ]);

    // Calculate percentage changes
    const caseChangePercent =
      lastMonthCases > 0
        ? Math.round(((totalCases - lastMonthCases) / lastMonthCases) * 100)
        : 0;

    return {
      totalCases,
      activeCases,
      pendingCases,
      closedCases,
      totalClients,
      totalDocuments,
      totalBills,
      upcomingHearings,
      overdueBills,
      // Month-over-month data
      caseChangePercent,
      newCasesThisMonth,
      newClientsThisMonth,
    };
  }

  // Recent Activity for User
  async getRecentActivity(userId: string, limit: number = 10) {
    // Get user's role to determine what activities to show
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // For now, return mock data based on user role
    // In a real implementation, you would query actual activity logs
    const activities = [
      {
        id: '1',
        type: 'CASE_CREATED',
        description: 'New case created: Smith vs Johnson',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        user: 'John Lawyer',
        caseNumber: 'CASE-2024-001',
      },
      {
        id: '2',
        type: 'DOCUMENT_UPLOADED',
        description: 'Contract document uploaded',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        user: 'John Lawyer',
        caseNumber: 'CASE-2024-002',
      },
      {
        id: '3',
        type: 'NOTE_ADDED',
        description: 'Client meeting notes added',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        user: 'John Lawyer',
        caseNumber: 'CASE-2024-001',
      },
    ];

    return activities.slice(0, limit);
  }

  // Get Overdue Bills Details
  async getOverdueBills(lawyerId: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        case: {
          assignedLawyerId: lawyerId,
        },
        status: 'PENDING',
        dueDate: {
          lt: new Date(),
        },
      },
      select: {
        id: true,
        amount: true,
        description: true,
        dueDate: true,
        case: {
          select: {
            caseNumber: true,
            title: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 10,
    });
  }
}
