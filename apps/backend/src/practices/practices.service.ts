import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PracticeRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMemberDto,
  CreatePracticeDto,
  UpdateMemberRoleDto,
  UpdatePracticeDto,
} from './dto/practice.dto';

@Injectable()
export class PracticesService {
  constructor(private prisma: PrismaService) {}

  async createPractice(userId: string, createPracticeDto: CreatePracticeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const practice = await this.prisma.practice.create({
      data: {
        name: createPracticeDto.name,
        description: createPracticeDto.description,
        practiceType: createPracticeDto.practiceType,
        isActive: true,
        members: {
          create: {
            userId,
            role: PracticeRole.OWNER,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Update user's primary practice
    await this.prisma.user.update({
      where: { id: userId },
      data: { primaryPracticeId: practice.id },
    });

    return practice;
  }

  async getPracticeById(practiceId: string, userId: string) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        clients: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    // Check if user is a member of this practice
    const isMember = practice.members.some(
      (member) => member.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Access denied to this practice');
    }

    return practice;
  }

  async getUserPractices(userId: string) {
    return this.prisma.practice.findMany({
      where: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            clients: true,
            members: true,
          },
        },
      },
    });
  }

  async updatePractice(
    practiceId: string,
    userId: string,
    updatePracticeDto: UpdatePracticeDto,
  ) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    const member = practice.members[0];
    if (!member || member.role !== PracticeRole.OWNER) {
      throw new ForbiddenException(
        'Insufficient permissions to update practice',
      );
    }

    return this.prisma.practice.update({
      where: { id: practiceId },
      data: updatePracticeDto,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async addMember(
    practiceId: string,
    userId: string,
    addMemberDto: AddMemberDto,
  ) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    const member = practice.members[0];
    if (!member || member.role !== PracticeRole.OWNER) {
      throw new ForbiddenException('Insufficient permissions to add members');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: addMemberDto.email },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found with this email');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.practiceMember.findFirst({
      where: {
        practiceId,
        userId: existingUser.id,
      },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a member of this practice');
    }

    return this.prisma.practiceMember.create({
      data: {
        practiceId,
        userId: existingUser.id,
        role: addMemberDto.role,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    practiceId: string,
    adminUserId: string,
    memberId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        members: {
          where: { userId: adminUserId },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    const adminMember = practice.members[0];
    if (!adminMember || adminMember.role !== PracticeRole.OWNER) {
      throw new ForbiddenException(
        'Insufficient permissions to update member roles',
      );
    }

    // Cannot change OWNER role
    if (updateMemberRoleDto.role === PracticeRole.OWNER) {
      throw new ForbiddenException('Cannot change role to OWNER');
    }

    return this.prisma.practiceMember.update({
      where: { id: memberId },
      data: { role: updateMemberRoleDto.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async removeMember(
    practiceId: string,
    adminUserId: string,
    memberId: string,
  ) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        members: {
          where: { userId: adminUserId },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    const adminMember = practice.members[0];
    if (!adminMember || adminMember.role !== PracticeRole.OWNER) {
      throw new ForbiddenException(
        'Insufficient permissions to remove members',
      );
    }

    const memberToRemove = await this.prisma.practiceMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove OWNER
    if (memberToRemove.role === PracticeRole.OWNER) {
      throw new ForbiddenException('Cannot remove practice owner');
    }

    return this.prisma.practiceMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });
  }

  async getPracticeStats(practiceId: string, userId: string) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    const isMember = practice.members.some(
      (member) => member.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Access denied to this practice');
    }

    const [clientCount, caseCount, documentCount, billingTotal] =
      await Promise.all([
        this.prisma.client.count({
          where: { practiceId, isActive: true },
        }),
        this.prisma.legalCase.count({
          where: { practiceId },
        }),
        this.prisma.legalDocument.count({
          where: { practiceId },
        }),
        this.prisma.billingRecord.aggregate({
          where: { practiceId },
          _sum: { amount: true },
        }),
      ]);

    return {
      clientCount,
      caseCount,
      documentCount,
      billingTotal: billingTotal._sum.amount || 0,
    };
  }
}
