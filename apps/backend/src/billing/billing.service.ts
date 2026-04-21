import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillStatus, BillType, Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBillingRecordDto {
  amount: number;
  currency?: Currency;
  description: string;
  billType: BillType;
  dueDate?: Date | string;
  caseId?: string;
  clientId?: string;
  userId: string;
  practiceId?: string;
}

export interface UpdateBillingRecordDto {
  amount?: number;
  currency?: Currency;
  description?: string;
  billType?: BillType;
  status?: BillStatus;
  dueDate?: Date | string;
  paidDate?: Date | string;
  caseId?: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private normalizeDateInput(
    fieldName: string,
    value?: Date | string,
  ): Date | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`Invalid ${fieldName}`);
      }
      return value;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    // Accept HTML date input format (YYYY-MM-DD) and convert to midnight UTC.
    const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
      ? `${trimmedValue}T00:00:00.000Z`
      : trimmedValue;
    const parsedDate = new Date(isoCandidate);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return parsedDate;
  }

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

  private async resolveUserPracticeId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    const practiceId = user?.primaryPracticeId ?? user?.practices[0]?.practiceId;
    if (!practiceId) {
      throw new ForbiddenException('No practice access found for this user');
    }

    return practiceId;
  }

  async create(createBillingRecordDto: CreateBillingRecordDto) {
    let resolvedPracticeId = createBillingRecordDto.practiceId;
    let resolvedClientId = createBillingRecordDto.clientId;

    if (createBillingRecordDto.caseId) {
      const legalCase = await this.prisma.legalCase.findUnique({
        where: { id: createBillingRecordDto.caseId },
        select: {
          id: true,
          practiceId: true,
          clientId: true,
        },
      });

      if (!legalCase) {
        throw new NotFoundException('Case not found');
      }

      if (
        resolvedPracticeId &&
        resolvedPracticeId !== legalCase.practiceId
      ) {
        throw new BadRequestException(
          'Selected case does not belong to the provided practice',
        );
      }

      resolvedPracticeId = legalCase.practiceId;
      resolvedClientId = resolvedClientId ?? legalCase.clientId;
    } else if (resolvedClientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: resolvedClientId },
        select: {
          id: true,
          practiceId: true,
        },
      });

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      if (resolvedPracticeId && resolvedPracticeId !== client.practiceId) {
        throw new BadRequestException(
          'Selected client does not belong to the provided practice',
        );
      }

      resolvedPracticeId = resolvedPracticeId ?? client.practiceId;
    }

    if (!resolvedPracticeId) {
      resolvedPracticeId = await this.resolveUserPracticeId(
        createBillingRecordDto.userId,
      );
    }

    // Validate practice access
    await this.validatePracticeAccess(
      createBillingRecordDto.userId,
      resolvedPracticeId,
    );

    const normalizedDueDate = this.normalizeDateInput(
      'dueDate',
      createBillingRecordDto.dueDate,
    );

    return this.prisma.billingRecord.create({
      data: {
        ...createBillingRecordDto,
        dueDate: normalizedDueDate,
        practiceId: resolvedPracticeId,
        clientId: resolvedClientId,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // SUPER_ADMIN can see all billing records
    if (user.role === 'SUPER_ADMIN') {
      // No additional filters needed
    }
    // ADMIN can see all billing records from all practices (read-only access)
    else if (user.role === 'ADMIN') {
      // No additional filters needed - admin can see all billing records
    }
    // LAWYER, ASSOCIATE, and PARALEGAL can see billing records from their practices
    else if (['LAWYER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)) {
      const practiceIds = user.practices.map((p) => p.practiceId);
      if (practiceIds.length > 0) {
        where.practiceId = { in: practiceIds };
      } else {
        // If no practices, they can only see their own billing records
        where.userId = userId;
      }
    }
    // CLIENT can only see their own billing records
    else {
      where.userId = userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.billType) {
      where.billType = query.billType;
    }

    if (query.caseId) {
      where.caseId = query.caseId;
    }

    const billingRecords = await this.prisma.billingRecord.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return billingRecords;
  }

  async findOne(id: string, userId: string) {
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, billingRecord.practiceId);

    return billingRecord;
  }

  async update(
    id: string,
    updateBillingRecordDto: UpdateBillingRecordDto,
    userId: string,
  ) {
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, billingRecord.practiceId);

    const normalizedDueDate = this.normalizeDateInput(
      'dueDate',
      updateBillingRecordDto.dueDate,
    );
    const normalizedPaidDate = this.normalizeDateInput(
      'paidDate',
      updateBillingRecordDto.paidDate,
    );

    return this.prisma.billingRecord.update({
      where: { id },
      data: {
        ...updateBillingRecordDto,
        dueDate: normalizedDueDate,
        paidDate: normalizedPaidDate,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, billingRecord.practiceId);

    return this.prisma.billingRecord.delete({
      where: { id },
    });
  }

  async markAsPaid(id: string, userId: string) {
    // Check if user has access to this billing record
    await this.findOne(id, userId);

    return this.prisma.billingRecord.update({
      where: { id },
      data: {
        status: BillStatus.PAID,
        paidDate: new Date(),
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUser(userId: string, currentUserId: string) {
    // Only allow users to see their own billing records or admin access
    if (userId !== currentUserId) {
      throw new NotFoundException('Access denied');
    }

    return this.prisma.billingRecord.findMany({
      where: { userId },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCase(caseId: string, currentUserId: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        caseId,
        userId: currentUserId,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBillingStats(userId: string) {
    const [
      totalBills,
      paidBills,
      pendingBills,
      overdueBills,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
    ] = await Promise.all([
      this.prisma.billingRecord.count({
        where: { userId },
      }),
      this.prisma.billingRecord.count({
        where: {
          userId,
          status: 'PAID',
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          userId,
          status: 'PENDING',
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          userId,
          status: 'OVERDUE',
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: { userId },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: {
          userId,
          status: 'PAID',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: {
          userId,
          status: 'PENDING',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: {
          userId,
          status: 'OVERDUE',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      totalBills,
      paidBills,
      pendingBills,
      overdueBills,
      totalAmount: totalAmount._sum.amount || 0,
      paidAmount: paidAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      overdueAmount: overdueAmount._sum.amount || 0,
    };
  }

  async getOverdueBills(userId: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        userId,
        status: 'OVERDUE',
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }
}
