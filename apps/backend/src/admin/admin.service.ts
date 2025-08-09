import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSystemStats() {
    const [
      totalUsers,
      totalLawyers,
      totalClients,
      totalCases,
      totalDocuments,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { role: { in: ['LAWYER', 'ASSOCIATE', 'PARALEGAL'] } },
      }),
      this.prisma.user.count({
        where: { role: 'CLIENT' },
      }),
      this.prisma.legalCase.count(),
      this.prisma.legalDocument.count(),
      this.prisma.user.count({
        where: { isActive: false },
      }),
    ]);

    // Calculate total revenue from billing records
    const billingRecords = await this.prisma.billingRecord.findMany({
      where: { status: 'PAID' },
      select: { amount: true },
    });

    const totalRevenue = billingRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0,
    );

    return {
      totalUsers,
      totalLawyers,
      totalClients,
      totalCases,
      totalDocuments,
      totalRevenue,
      pendingApprovals,
      systemHealth: 'Excellent',
    };
  }

  async getRecentActivity(limit: number = 10) {
    const where: Record<string, unknown> = {};

    const activities = await this.prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return activities;
  }

  async getLawyers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const where: Record<string, unknown> = {
      role: { in: ['LAWYER', 'ASSOCIATE', 'PARALEGAL'] },
    };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.role && filters.role !== 'all') {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const lawyers = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return lawyers.map((lawyer) => ({
      id: lawyer.id,
      name: lawyer.name,
      email: lawyer.email,
      phone: lawyer.phone,
      role: lawyer.role,
      isActive: lawyer.isActive,
      joinDate: lawyer.createdAt,
      casesCount: 0, // TODO: Implement case count query
    }));
  }

  async createLawyer(data: {
    name: string;
    email: string;
    password: string;
    role: 'LAWYER' | 'ASSOCIATE' | 'PARALEGAL';
    phone?: string;
    specialization?: string;
  }) {
    const hashedPassword = await this.hashPassword(data.password);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        phone: data.phone,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      joinDate: user.createdAt,
      casesCount: 0,
    };
  }

  async updateLawyer(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: 'LAWYER' | 'ASSOCIATE' | 'PARALEGAL';
      phone?: string;
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      joinDate: user.createdAt,
      casesCount: 0, // You might want to fetch this separately
    };
  }

  async deleteLawyer(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 10);
  }
}
