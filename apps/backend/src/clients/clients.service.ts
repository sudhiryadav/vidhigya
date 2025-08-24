import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async getAllClients(userId: string) {
    // This is a temporary method for testing - in production, clients should be scoped to practices
    return this.prisma.client.findMany({
      where: {
        isActive: true,
      },
      include: {
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
        _count: {
          select: {
            cases: true,
            documents: true,
            billing: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createClient(
    practiceId: string,
    userId: string,
    createClientDto: CreateClientDto,
  ) {
    // First check if user is a super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any practice
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this practice
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
    }

    return this.prisma.client.create({
      data: {
        ...createClientDto,
        practiceId,
        isActive: true,
      },
    });
  }

  async getClientsByPractice(practiceId: string, userId: string) {
    // First check if user is a super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any practice
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this practice
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
    }

    return this.prisma.client.findMany({
      where: {
        practiceId,
        isActive: true,
      },
      include: {
        cases: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            cases: true,
            documents: true,
            billing: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getClientById(clientId: string, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        practice: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        cases: {
          include: {
            documents: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        billing: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        timeEntries: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check if user has access to this client's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any client
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this client's practice
      const practiceMember = client.practice.members[0];
      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this client');
      }
    }

    return client;
  }

  async updateClient(
    clientId: string,
    userId: string,
    updateClientDto: UpdateClientDto,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        practice: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check if user has access to this client's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any client
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this client's practice
      const practiceMember = client.practice.members[0];
      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this client');
      }
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: updateClientDto,
    });
  }

  async deleteClient(clientId: string, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        practice: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check if user has access to this client's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any client
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this client's practice
      const isPracticeMember = client.practice.members.some(
        (m) => m.userId === userId,
      );
      if (!isPracticeMember) {
        throw new ForbiddenException(
          'Insufficient permissions to delete client',
        );
      }
    }

    // Soft delete - mark as inactive
    return this.prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });
  }

  async searchClients(practiceId: string, userId: string, searchTerm: string) {
    // First check if user is a super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any practice
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this practice
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
    }

    return this.prisma.client.findMany({
      where: {
        practiceId,
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        _count: {
          select: {
            cases: true,
            documents: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getClientStats(practiceId: string, userId: string) {
    // First check if user is a super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any practice
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this practice
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
    }

    const [totalClients, activeClients, totalCases, totalBilling] =
      await Promise.all([
        this.prisma.client.count({
          where: { practiceId },
        }),
        this.prisma.client.count({
          where: { practiceId, isActive: true },
        }),
        this.prisma.legalCase.count({
          where: { practiceId },
        }),
        this.prisma.billingRecord.aggregate({
          where: { practiceId },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalClients,
      activeClients,
      totalCases,
      totalBilling: totalBilling._sum.amount || 0,
    };
  }
}
