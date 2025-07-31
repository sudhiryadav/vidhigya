import { Injectable, NotFoundException } from '@nestjs/common';
import { BillStatus, BillType, Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBillingRecordDto {
  amount: number;
  currency?: Currency;
  description: string;
  billType: BillType;
  dueDate?: Date;
  caseId?: string;
  userId: string;
}

export interface UpdateBillingRecordDto {
  amount?: number;
  currency?: Currency;
  description?: string;
  billType?: BillType;
  status?: BillStatus;
  dueDate?: Date;
  paidDate?: Date;
  caseId?: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async create(createBillingRecordDto: CreateBillingRecordDto) {
    return this.prisma.billingRecord.create({
      data: createBillingRecordDto,
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

  async findAll(userId: string, query: any = {}) {
    const where: any = {
      userId,
    };

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

    return this.prisma.billingRecord.update({
      where: { id },
      data: updateBillingRecordDto,
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
