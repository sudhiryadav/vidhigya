import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

interface TaskAccessContext {
  role: string;
  practiceIds: string[];
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async getTaskAccessContext(
    userId: string,
  ): Promise<TaskAccessContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      role: user.role,
      practiceIds: user.practices.map((p) => p.practiceId),
    };
  }

  private canReadTask(
    userId: string,
    access: TaskAccessContext,
    task: {
      practiceId: string;
      createdById: string;
      assignedToId: string | null;
    },
  ): boolean {
    if (access.role === 'SUPER_ADMIN') return true;
    if (access.role === 'ADMIN' || access.role === 'LAWYER') {
      return access.practiceIds.includes(task.practiceId);
    }
    return (
      access.practiceIds.includes(task.practiceId) &&
      (task.createdById === userId || task.assignedToId === userId)
    );
  }

  private canManageTask(
    userId: string,
    access: TaskAccessContext,
    task: {
      practiceId: string;
      createdById: string;
      assignedToId: string | null;
    },
  ): boolean {
    if (access.role === 'SUPER_ADMIN') return true;
    if (access.role === 'ADMIN' || access.role === 'LAWYER') {
      return access.practiceIds.includes(task.practiceId);
    }
    return (
      access.practiceIds.includes(task.practiceId) &&
      (task.createdById === userId || task.assignedToId === userId)
    );
  }

  async getAllTasks(userId: string) {
    const access = await this.getTaskAccessContext(userId);

    if (access.role === 'SUPER_ADMIN') {
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
      const practiceIds = access.practiceIds;

      if (practiceIds.length === 0) {
        return [];
      }

      const baseWhere =
        access.role === 'ADMIN' || access.role === 'LAWYER'
          ? { practiceId: { in: practiceIds } }
          : {
              practiceId: { in: practiceIds },
              OR: [{ createdById: userId }, { assignedToId: userId }],
            };

      return this.prisma.task.findMany({
        where: baseWhere,
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
    const access = await this.getTaskAccessContext(userId);
    if (
      access.role !== 'SUPER_ADMIN' &&
      !access.practiceIds.includes(createTaskDto.practiceId)
    ) {
      throw new ForbiddenException('Access denied to this practice');
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
    const access = await this.getTaskAccessContext(userId);
    if (
      access.role !== 'SUPER_ADMIN' &&
      !access.practiceIds.includes(practiceId)
    ) {
      throw new ForbiddenException('Access denied to this practice');
    }

    const where =
      access.role === 'SUPER_ADMIN' ||
      access.role === 'ADMIN' ||
      access.role === 'LAWYER'
        ? { practiceId }
        : {
            practiceId,
            OR: [{ createdById: userId }, { assignedToId: userId }],
          };

    return this.prisma.task.findMany({
      where,
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
    const access = await this.getTaskAccessContext(userId);
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

    if (!this.canReadTask(userId, access, task)) {
      throw new ForbiddenException('Access denied to this task');
    }

    return task;
  }

  async updateTask(
    taskId: string,
    userId: string,
    updateTaskDto: UpdateTaskDto,
  ) {
    const access = await this.getTaskAccessContext(userId);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        practiceId: true,
        createdById: true,
        assignedToId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canManageTask(userId, access, task)) {
      throw new ForbiddenException('Access denied to this task');
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
    const access = await this.getTaskAccessContext(userId);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        practiceId: true,
        createdById: true,
        assignedToId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canManageTask(userId, access, task)) {
      throw new ForbiddenException('Access denied to this task');
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
    const access = await this.getTaskAccessContext(userId);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        practiceId: true,
        createdById: true,
        assignedToId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const canAssign =
      access.role === 'SUPER_ADMIN' ||
      ((access.role === 'ADMIN' || access.role === 'LAWYER') &&
        access.practiceIds.includes(task.practiceId));
    if (!canAssign) {
      throw new ForbiddenException('Access denied to assign this task');
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
