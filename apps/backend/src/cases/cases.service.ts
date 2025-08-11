import {
  BadRequestException,
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
  filingDate?: Date;
  nextHearingDate?: Date;
  estimatedCompletionDate?: Date;
  clientId: string;
  assignedLawyerId: string;
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
  filingDate?: Date;
  nextHearingDate?: Date;
  estimatedCompletionDate?: Date;
  assignedLawyerId?: string;
}

export interface CreateCaseNoteDto {
  content: string;
  type: NoteType;
  caseId: string;
  userId: string;
}

export interface UpdateCaseNoteDto {
  content?: string;
  type?: NoteType;
}

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  // Case Management
  async create(createCaseDto: CreateCaseDto) {
    // Check if case number already exists
    const existingCase = await this.prisma.legalCase.findUnique({
      where: { caseNumber: createCaseDto.caseNumber },
    });

    if (existingCase) {
      throw new BadRequestException('Case number already exists');
    }

    return this.prisma.legalCase.create({
      data: createCaseDto,
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
    const where: Record<string, unknown> = {
      OR: [{ assignedLawyerId: userId }, { clientId: userId }],
    };

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
        assignedLawyerId: userId,
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

    return legalCase;
  }

  async update(id: string, updateCaseDto: UpdateCaseDto, userId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id,
        assignedLawyerId: userId,
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    return this.prisma.legalCase.update({
      where: { id },
      data: updateCaseDto,
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
        assignedLawyerId: userId,
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    return this.prisma.legalCase.delete({
      where: { id },
    });
  }

  // Case Notes Management
  async createNote(createNoteDto: CreateCaseNoteDto) {
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
      role: 'CLIENT';
      clientCases?: {
        some: {
          assignedLawyerId: string;
        };
      };
    } = {
      role: 'CLIENT',
    };

    // For non-admin users, only show clients with cases assigned to them
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      where.clientCases = {
        some: {
          assignedLawyerId: lawyerId,
        },
      };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        clientCases: {
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
      role: 'CLIENT';
      clientCases?: {
        some: {
          assignedLawyerId: string;
        };
      };
    } = {
      id: clientId,
      role: 'CLIENT',
    };

    // For non-admin users, only show clients with cases assigned to them
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      where.clientCases = {
        some: {
          assignedLawyerId: lawyerId,
        },
      };
    }

    const client = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        clientCases: {
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
      this.prisma.user.count({
        where: {
          role: 'CLIENT',
          clientCases: {
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
      this.prisma.user.count({
        where: {
          role: 'CLIENT',
          clientCases: {
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
