import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private buildDocumentQueryWhere(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    caseId?: string,
  ): Prisma.DocumentQueryWhereInput {
    return {
      userId,
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      ...(caseId && { caseId }),
    };
  }

  // AI Usage Analytics
  async getAIUsageAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const where = this.buildDocumentQueryWhere(userId, startDate, endDate);

    const [totalQueries, queriesByType, dailyUsage, responseTimes] =
      await Promise.all([
        this.prisma.documentQuery.count({
          where: { ...where, isDeleted: false },
        }),
        this.prisma.documentQuery.groupBy({
          by: ['queryType'],
          where: { ...where, isDeleted: false },
          _count: { queryType: true },
        }),
        this.prisma.documentQuery.groupBy({
          by: ['createdAt'],
          where: { ...where, isDeleted: false },
          _count: { createdAt: true },
        }),
        this.prisma.documentQuery.findMany({
          where: { ...where, isDeleted: false, responseTime: { not: null } },
          select: { responseTime: true },
        }),
      ]);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, q) => sum + q.responseTime, 0) /
          responseTimes.length
        : 0;

    return {
      totalQueries,
      queriesByType: queriesByType.map((q) => ({
        type: q.queryType,
        count: q._count.queryType,
      })),
      dailyUsage: dailyUsage.map((d) => ({
        date: d.createdAt,
        count: d._count.createdAt,
      })),
      avgResponseTime: Math.round(avgResponseTime),
    };
  }

  // Feedback Analytics
  async getFeedbackAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const where = {
      userId,
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [totalFeedback, positiveFeedback, negativeFeedback, feedbackTrend] =
      await Promise.all([
        this.prisma.feedback.count({ where }),
        this.prisma.feedback.count({
          where: { ...where, feedback: 'POSITIVE' },
        }),
        this.prisma.feedback.count({
          where: { ...where, feedback: 'NEGATIVE' },
        }),
        this.prisma.feedback.groupBy({
          by: ['createdAt', 'feedback'],
          where,
          _count: { feedback: true },
        }),
      ]);

    const satisfactionRate =
      totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

    return {
      totalFeedback,
      positiveFeedback,
      negativeFeedback,
      satisfactionRate: Math.round(satisfactionRate * 100) / 100,
      feedbackTrend: feedbackTrend.map((f) => ({
        date: f.createdAt,
        type: f.feedback,
        count: f._count.feedback,
      })),
    };
  }

  // Case-Specific Analytics
  async getCaseSpecificAnalytics(userId: string, caseId?: string) {
    const where = this.buildDocumentQueryWhere(
      userId,
      undefined,
      undefined,
      caseId,
    );

    const [caseQueries, queryTypes, recentQueries] = await Promise.all([
      this.prisma.documentQuery.findMany({
        where: { ...where, isDeleted: false, caseId: { not: null } },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              caseNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentQuery.groupBy({
        by: ['queryType'],
        where: { ...where, isDeleted: false, caseId: { not: null } },
        _count: { queryType: true },
      }),
      this.prisma.documentQuery.findMany({
        where: { ...where, isDeleted: false },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          case: {
            select: {
              id: true,
              title: true,
              caseNumber: true,
            },
          },
        },
      }),
    ]);

    return {
      caseQueries,
      queryTypes: queryTypes.map((q) => ({
        type: q.queryType,
        count: q._count.queryType,
      })),
      recentQueries,
    };
  }

  // Productivity Metrics
  async getProductivityMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where = this.buildDocumentQueryWhere(userId, startDate, endDate);

    const [totalQueries, avgQueriesPerDay, peakUsageHour, mostUsedFeatures] =
      await Promise.all([
        this.prisma.documentQuery.count({
          where: { ...where, isDeleted: false },
        }),
        this.getAverageQueriesPerDay({ ...where, isDeleted: false }),
        this.getPeakUsageHour({ ...where, isDeleted: false }),
        this.prisma.documentQuery.groupBy({
          by: ['queryType'],
          where: { ...where, isDeleted: false },
          _count: { queryType: true },
          orderBy: { _count: { queryType: 'desc' } },
          take: 5,
        }),
      ]);

    return {
      totalQueries,
      avgQueriesPerDay: Math.round(avgQueriesPerDay * 100) / 100,
      peakUsageHour,
      mostUsedFeatures: mostUsedFeatures.map((f) => ({
        feature: f.queryType,
        usageCount: f._count.queryType,
      })),
    };
  }

  // Comprehensive Dashboard Report
  async getDashboardReport(
    userId: string,
    period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const endDate = new Date();
    const startDate = this.getStartDate(period);

    const [aiUsage, feedback, productivity, recentActivity] = await Promise.all(
      [
        this.getAIUsageAnalytics(userId, startDate, endDate),
        this.getFeedbackAnalytics(userId, startDate, endDate),
        this.getProductivityMetrics(userId, startDate, endDate),
        this.getRecentActivity(userId, 10),
      ],
    );

    return {
      period,
      startDate,
      endDate,
      aiUsage,
      feedback,
      productivity,
      recentActivity,
      summary: {
        totalQueries: aiUsage.totalQueries,
        satisfactionRate: feedback.satisfactionRate,
        avgResponseTime: aiUsage.avgResponseTime,
        avgQueriesPerDay: productivity.avgQueriesPerDay,
      },
    };
  }

  // Recent Activity
  async getRecentActivity(userId: string, limit: number = 10) {
    return this.prisma.documentQuery.findMany({
      where: { userId, isDeleted: false },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
      },
    });
  }

  // Helper methods
  private async getAverageQueriesPerDay(
    where: Prisma.DocumentQueryWhereInput,
  ): Promise<number> {
    const result = await this.prisma.documentQuery.groupBy({
      by: ['createdAt'],
      where: { ...where, isDeleted: false },
      _count: { createdAt: true },
    });

    if (result.length === 0) return 0;

    const totalQueries = result.reduce(
      (sum, day) => sum + day._count.createdAt,
      0,
    );
    const uniqueDays = new Set(
      result.map((day) => day.createdAt.toDateString()),
    ).size;

    return totalQueries / uniqueDays;
  }

  private async getPeakUsageHour(
    where: Prisma.DocumentQueryWhereInput,
  ): Promise<number> {
    const result = await this.prisma.documentQuery.findMany({
      where: { ...where, isDeleted: false },
      select: { createdAt: true },
    });

    if (result.length === 0) return 0;

    const hourCounts: number[] = new Array(24).fill(0);
    result.forEach((query) => {
      const hour = query.createdAt.getHours();
      hourCounts[hour]++;
    });

    return hourCounts.indexOf(Math.max(...hourCounts));
  }

  private getStartDate(period: 'week' | 'month' | 'quarter'): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  }
}
