import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async getAllTasks(userId: string) {
    // First check if user is a super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can see all tasks
    if (user.role === 'SUPER_ADMIN') {
      return this.prisma.task.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          practice: {
            select: {
              id: true,
              name: true,
              practiceType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      // For non-super admins, get tasks from practices they're members of
      const practiceMemberships = await this.prisma.practiceMember.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          practiceId: true,
        },
      });

      const practiceIds = practiceMemberships.map((pm) => pm.practiceId);

      if (practiceIds.length === 0) {
        return [];
      }

      return this.prisma.task.findMany({
        where: {
          practiceId: {
            in: practiceIds,
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          practice: {
            select: {
              id: true,
              name: true,
              practiceType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
  }

  async createTask(userId: string, createTaskDto: CreateTaskDto) {
    // First check if user is a super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can create tasks in any practice
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this practice
      const practiceMember = await this.prisma.practiceMember.findFirst({
        where: {
          practiceId: createTaskDto.practiceId,
          userId,
          isActive: true,
        },
      });

      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this practice');
      }
    }

    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        createdById: userId,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
      },
    });
  }

  async getTasksByPractice(practiceId: string, userId: string) {
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

    return this.prisma.task.findMany({
      where: {
        practiceId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getTaskById(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has access to this task's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can access any task
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this task's practice
      const practiceMember = await this.prisma.practiceMember.findFirst({
        where: {
          practiceId: task.practiceId,
          userId,
          isActive: true,
        },
      });

      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this task');
      }
    }

    return task;
  }

  async updateTask(
    taskId: string,
    userId: string,
    updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has access to this task's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can update any task
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this task's practice
      const practiceMember = task.practice.members[0];
      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this task');
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateTaskDto,
        dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : null,
        completedAt: updateTaskDto.status === 'COMPLETED' ? new Date() : null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
      },
    });
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has access to this task's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can delete any task
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this task's practice
      const practiceMember = task.practice.members[0];
      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this task');
      }
    }

    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  async assignTask(
    taskId: string,
    userId: string,
    assignTaskDto: AssignTaskDto,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has access to this task's practice
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admins can assign any task
    if (user.role === 'SUPER_ADMIN') {
      // Continue without membership check
    } else {
      // For non-super admins, check if they have access to this task's practice
      const practiceMember = task.practice.members[0];
      if (!practiceMember) {
        throw new ForbiddenException('Access denied to this task');
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        assignedToId: assignTaskDto.assignedToId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
      },
    });
  }

  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: {
        OR: [{ createdById: userId }, { assignedToId: userId }],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practice: {
          select: {
            id: true,
            name: true,
            practiceType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
