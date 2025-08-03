import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto, FeedbackType } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(createFeedbackDto: CreateFeedbackDto, userId: string) {
    return this.prisma.feedback.create({
      data: {
        userId,
        messageId: createFeedbackDto.messageId,
        feedback: createFeedbackDto.feedback,
        question: createFeedbackDto.question,
        answer: createFeedbackDto.answer,
      },
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
  }

  async findAll(userId?: string) {
    const where = userId ? { userId } : {};

    return this.prisma.feedback.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.feedback.findUnique({
      where: { id },
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
  }

  async findByUser(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getFeedbackStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, positive, negative] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.count({
        where: { ...where, feedback: FeedbackType.POSITIVE },
      }),
      this.prisma.feedback.count({
        where: { ...where, feedback: FeedbackType.NEGATIVE },
      }),
    ]);

    return {
      total,
      positive,
      negative,
      satisfactionRate: total > 0 ? (positive / total) * 100 : 0,
    };
  }

  async remove(id: string, userId: string) {
    return this.prisma.feedback.delete({
      where: {
        id,
        userId, // Ensure user can only delete their own feedback
      },
    });
  }
}
