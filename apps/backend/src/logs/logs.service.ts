import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLogDto } from './dto/create-log.dto';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async create(createLogDto: any) {
    const logData = {
      level: createLogDto.level,
      message: createLogDto.message,
      userId: createLogDto.userId,
      meta: createLogDto.meta || {},
    };

    const log = await this.prisma.log.create({
      data: logData,
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

    return log;
  }

  async findAll(limit?: number, offset?: number) {
    const logs = await this.prisma.log.findMany({
      take: limit || 50,
      skip: offset || 0,
      orderBy: { createdAt: 'desc' },
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

    return logs;
  }

  async getStats() {
    const [totalLogs, errorLogs, warningLogs, infoLogs, debugLogs, recentLogs] =
      await Promise.all([
        this.prisma.log.count(),
        this.prisma.log.count({ where: { level: 'error' } }),
        this.prisma.log.count({ where: { level: 'warn' } }),
        this.prisma.log.count({ where: { level: 'info' } }),
        this.prisma.log.count({ where: { level: 'debug' } }),
        this.prisma.log.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

    return {
      totalLogs,
      errorLogs,
      warningLogs,
      infoLogs,
      debugLogs,
      recentLogs,
      errorPercentage: totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0,
    };
  }
}
