import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

  // New methods for admin pages
  async getDocuments(filters?: {
    search?: string;
    status?: string;
    type?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.type && filters.type !== 'all') {
      where.fileType = filters.type;
    }

    if (filters?.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const documents = await this.prisma.legalDocument.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      type: doc.fileType,
      status: doc.status,
      size: doc.fileSize,
      uploadedBy: doc.uploadedBy?.name || 'Unknown',
      caseTitle: doc.case?.title || 'No Case',
      uploadDate: doc.createdAt,
      lastModified: doc.updatedAt,
    }));
  }

  async getBillingRecords(filters?: {
    search?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const billingRecords = await this.prisma.billingRecord.findMany({
      where,
      include: {
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

    return billingRecords.map((record) => ({
      id: record.id,
      description: record.description,
      amount: record.amount,
      status: record.status,
      dueDate: record.dueDate,
      client: record.user?.name || 'Unknown',
      clientEmail: record.user?.email || 'Unknown',
      createdDate: record.createdAt,
      paidDate: record.paidDate,
    }));
  }

  async getAnalytics() {
    const [
      totalUsers,
      totalCases,
      totalDocuments,
      totalBilling,
      monthlyUsers,
      monthlyCases,
      monthlyDocuments,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.legalCase.count(),
      this.prisma.legalDocument.count(),
      this.prisma.billingRecord.count(),
      this.getMonthlyStats('users'),
      this.getMonthlyStats('cases'),
      this.getMonthlyStats('documents'),
      this.getMonthlyStats('revenue'),
    ]);

    return {
      overview: {
        totalUsers,
        totalCases,
        totalDocuments,
        totalBilling,
      },
      trends: {
        users: monthlyUsers,
        cases: monthlyCases,
        documents: monthlyDocuments,
        revenue: monthlyRevenue,
      },
      performance: {
        systemUptime: 99.9,
        averageResponseTime: 150,
        errorRate: 0.1,
      },
    };
  }

  async getReports() {
    const reportTemplates = [
      {
        id: 'user-activity',
        name: 'User Activity Report',
        description: 'Comprehensive user activity and engagement metrics',
        parameters: ['dateRange', 'userType', 'activityType'],
      },
      {
        id: 'case-performance',
        name: 'Case Performance Report',
        description: 'Case outcomes, timelines, and success rates',
        parameters: ['dateRange', 'caseType', 'outcome'],
      },
      {
        id: 'financial-summary',
        name: 'Financial Summary Report',
        description: 'Revenue, billing, and financial performance',
        parameters: ['dateRange', 'billingStatus', 'revenueType'],
      },
      {
        id: 'document-analytics',
        name: 'Document Analytics Report',
        description: 'Document processing, usage, and storage metrics',
        parameters: ['dateRange', 'documentType', 'status'],
      },
    ];

    return {
      templates: reportTemplates,
      generatedReports: [], // TODO: Implement report generation history
    };
  }

  private async getMonthlyStats(
    type: 'users' | 'cases' | 'documents' | 'revenue',
  ) {
    const months = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      let count = 0;

      switch (type) {
        case 'users':
          count = await this.prisma.user.count({
            where: {
              createdAt: {
                gte: date,
                lte: endDate,
              },
            },
          });
          break;
        case 'cases':
          count = await this.prisma.legalCase.count({
            where: {
              createdAt: {
                gte: date,
                lte: endDate,
              },
            },
          });
          break;
        case 'documents':
          count = await this.prisma.legalDocument.count({
            where: {
              createdAt: {
                gte: date,
                lte: endDate,
              },
            },
          });
          break;
        case 'revenue':
          const records = await this.prisma.billingRecord.findMany({
            where: {
              status: 'PAID',
              paidDate: {
                gte: date,
                lte: endDate,
              },
            },
            select: { amount: true },
          });
          count = records.reduce(
            (sum, record) => sum + Number(record.amount),
            0,
          );
          break;
      }

      months.push({
        month: date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        count,
      });
    }

    return months;
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

  /**
   * Get all users (SUPER_ADMIN only - can see all users across all practices)
   */
  async getAllUsers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
    practiceId?: string;
  }) {
    const where: Record<string, unknown> = {};

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

    if (filters?.practiceId) {
      where.practices = {
        some: {
          practiceId: filters.practiceId,
          isActive: true,
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: {
            practice: {
              select: {
                id: true,
                name: true,
                practiceType: true,
              },
            },
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * Get users within a specific practice (ADMIN can see practice users)
   */
  async getPracticeUsers(
    practiceId: string,
    filters?: {
      search?: string;
      role?: string;
      isActive?: boolean;
    },
  ) {
    const where: Record<string, unknown> = {
      practices: {
        some: {
          practiceId,
          isActive: true,
        },
      },
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

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        practices: {
          where: { practiceId, isActive: true },
          select: {
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * Update user information (including password change)
   */
  async updateUser(
    userId: string,
    updateData: {
      name?: string;
      email?: string;
      phone?: string;
      isActive?: boolean;
      role?: UserRole;
      password?: string;
    },
    currentUserId: string,
    currentUserRole: string,
    currentUserPracticeId?: string,
  ) {
    // Check if current user has permission to update this user
    const canUpdate = await this.canUpdateUser(
      currentUserId,
      currentUserRole,
      currentUserPracticeId,
      userId,
    );

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this user',
      );
    }

    // If changing password, hash it
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Check if current user can update target user
   */
  private async canUpdateUser(
    currentUserId: string,
    currentUserRole: string,
    currentUserPracticeId?: string,
    targetUserId?: string,
  ): Promise<boolean> {
    // SUPER_ADMIN can update any user
    if (currentUserRole === 'SUPER_ADMIN') {
      return true;
    }

    // ADMIN can only update users in their practice
    if (currentUserRole === 'ADMIN' && currentUserPracticeId) {
      if (!targetUserId) return false;

      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          practices: {
            where: {
              practiceId: currentUserPracticeId,
              isActive: true,
            },
          },
        },
      });

      return targetUser && targetUser.practices.length > 0;
    }

    return false;
  }

  /**
   * Reset user password (admin-initiated)
   */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    currentUserId: string,
    currentUserRole: string,
    currentUserPracticeId?: string,
  ) {
    // Check if current user has permission to reset password
    const canUpdate = await this.canUpdateUser(
      currentUserId,
      currentUserRole,
      currentUserPracticeId,
      userId,
    );

    if (!canUpdate) {
      throw new ForbiddenException(
        "You do not have permission to reset this user's password",
      );
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Deactivate user
   */
  async deactivateUser(
    userId: string,
    currentUserId: string,
    currentUserRole: string,
    currentUserPracticeId?: string,
  ) {
    // Check if current user has permission to deactivate this user
    const canUpdate = await this.canUpdateUser(
      currentUserId,
      currentUserRole,
      currentUserPracticeId,
      userId,
    );

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to deactivate this user',
      );
    }

    // Prevent deactivating own account
    if (userId === currentUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Reactivate user
   */
  async reactivateUser(
    userId: string,
    currentUserId: string,
    currentUserRole: string,
    currentUserPracticeId?: string,
  ) {
    // Check if current user has permission to reactivate this user
    const canUpdate = await this.canUpdateUser(
      currentUserId,
      currentUserRole,
      currentUserPracticeId,
      userId,
    );

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to reactivate this user',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return { message: 'User reactivated successfully' };
  }

  /**
   * Get current user's practice information
   */
  async getCurrentUserPractice(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: {
            practiceId: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Create new user
   */
  async createUser(
    createData: {
      name: string;
      email: string;
      password: string;
      role: string;
      phone?: string;
    },
    currentUserId: string,
    currentUserRole: string,
    currentUserPracticeId?: string,
  ) {
    // Check if current user has permission to create users
    if (currentUserRole !== 'SUPER_ADMIN' && currentUserRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to create users',
      );
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createData.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(createData.password);

    // Create user
    const newUser = await this.prisma.user.create({
      data: {
        email: createData.email,
        password: hashedPassword,
        name: createData.name,
        role: createData.role as any,
        phone: createData.phone,
        isActive: true,
      },
    });

    // If user is created by ADMIN (not SUPER_ADMIN), add them to the practice
    if (currentUserRole === 'ADMIN' && currentUserPracticeId) {
      await this.prisma.practiceMember.create({
        data: {
          practiceId: currentUserPracticeId,
          userId: newUser.id,
          isActive: true,
        },
      });

      // Update user's primary practice
      await this.prisma.user.update({
        where: { id: newUser.id },
        data: { primaryPracticeId: currentUserPracticeId },
      });
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
