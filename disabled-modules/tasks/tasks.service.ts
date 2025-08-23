import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  caseId?: string;
  assignedToId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  caseId?: string;
  assignedToId?: string;
  completedAt?: Date;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async createTask(createTaskDto: CreateTaskDto, userId: string) {
    const { assignedToId, caseId, ...taskData } = createTaskDto;

    return this.prisma.task.create({
      data: {
        ...taskData,
        createdBy: {
          connect: { id: userId },
        },
        ...(assignedToId && {
          assignedTo: {
            connect: { id: assignedToId },
          },
        }),
        ...(caseId && {
          case: {
            connect: { id: caseId },
          },
        }),
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
      },
    });
  }

  async findAll(
    userId: string,
    filters?: {
      status?: TaskStatus;
      priority?: TaskPriority;
      caseId?: string;
      assignedToId?: string;
      dueDate?: Date;
    },
  ) {
    const where: {
      OR: Array<{ createdById: string } | { assignedToId: string }>;
      status?: TaskStatus;
      priority?: TaskPriority;
      caseId?: string;
      assignedToId?: string;
      dueDate?: { lte: Date };
    } = {
      OR: [{ createdById: userId }, { assignedToId: userId }],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.caseId) {
      where.caseId = filters.caseId;
    }

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters?.dueDate) {
      where.dueDate = {
        lte: filters.dueDate,
      };
    }

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
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
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
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!task) {
      throw new NotFoundException(
        'Task not found or you do not have permission to edit it',
      );
    }

    const { assignedToId, caseId, ...taskData } = updateTaskDto;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...taskData,
        ...(assignedToId && {
          assignedTo: {
            connect: { id: assignedToId },
          },
        }),
        ...(caseId && {
          case: {
            connect: { id: caseId },
          },
        }),
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
      },
    });
  }

  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!task) {
      throw new NotFoundException(
        'Task not found or you do not have permission to delete it',
      );
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }

  async markAsComplete(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: [{ createdById: userId }, { assignedToId: userId }],
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
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
      },
    });
  }

  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: {
          not: 'COMPLETED',
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
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async getOverdueTasks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.task.findMany({
      where: {
        OR: [{ createdById: userId }, { assignedToId: userId }],
        status: {
          not: 'COMPLETED',
        },
        dueDate: {
          lt: today,
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
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });
  }

  async getTasksByCase(caseId: string, userId: string) {
    return this.prisma.task.findMany({
      where: {
        caseId,
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
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getTaskStats(userId: string) {
    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      highPriorityTasks,
    ] = await Promise.all([
      this.prisma.task.count({
        where: {
          OR: [{ createdById: userId }, { assignedToId: userId }],
        },
      }),
      this.prisma.task.count({
        where: {
          OR: [{ createdById: userId }, { assignedToId: userId }],
          status: 'COMPLETED',
        },
      }),
      this.prisma.task.count({
        where: {
          OR: [{ createdById: userId }, { assignedToId: userId }],
          status: 'PENDING',
        },
      }),
      this.prisma.task.count({
        where: {
          OR: [{ createdById: userId }, { assignedToId: userId }],
          status: {
            not: 'COMPLETED',
          },
          dueDate: {
            lt: new Date(),
          },
        },
      }),
      this.prisma.task.count({
        where: {
          OR: [{ createdById: userId }, { assignedToId: userId }],
          priority: 'HIGH',
          status: {
            not: 'COMPLETED',
          },
        },
      }),
    ]);

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      highPriorityTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }
}
