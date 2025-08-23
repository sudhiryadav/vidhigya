import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionAction, PermissionResource } from './permission.types';

export interface PermissionAuditLog {
  userId: string;
  action: PermissionAction;
  resource: PermissionResource;
  resourceId?: string;
  practiceId?: string;
  allowed: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  userId?: string;
  action?: PermissionAction;
  resource?: PermissionResource;
  practiceId?: string;
  allowed?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PermissionAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a permission check
   */
  async logPermissionCheck(log: PermissionAuditLog): Promise<void> {
    try {
      // Create audit log entry (you might want to create a dedicated audit table)
      await this.prisma.log.create({
        data: {
          userId: log.userId,
          action: 'PERMISSION_CHECK',
          resource: `${log.resource}:${log.action}`,
          resourceId: log.resourceId,
          practiceId: log.practiceId || 'system',
          details: JSON.stringify({
            action: log.action,
            resource: log.resource,
            allowed: log.allowed,
            reason: log.reason,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            ...log.metadata,
          }),
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Log errors silently to avoid disrupting the main flow
      console.error('Failed to log permission check:', error);
    }
  }

  /**
   * Log a permission denial
   */
  async logPermissionDenial(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
    reason: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logPermissionCheck({
      userId,
      action,
      resource,
      allowed: false,
      reason,
      metadata,
    });
  }

  /**
   * Log a permission grant
   */
  async logPermissionGrant(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
    resourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logPermissionCheck({
      userId,
      action,
      resource,
      resourceId,
      allowed: true,
      metadata,
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filter: AuditLogFilter = {}) {
    const where: any = {
      action: 'PERMISSION_CHECK',
    };

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.practiceId) {
      where.practiceId = filter.practiceId;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const logs = await this.prisma.log.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: filter.limit || 100,
      skip: filter.offset || 0,
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

    // Parse and filter the logs
    return logs
      .map((log) => {
        try {
          const details = JSON.parse(log.details || '{}');

          // Apply additional filters
          if (filter.action && details.action !== filter.action) {
            return null;
          }
          if (filter.resource && details.resource !== filter.resource) {
            return null;
          }
          if (
            filter.allowed !== undefined &&
            details.allowed !== filter.allowed
          ) {
            return null;
          }
          if (filter.ipAddress && details.ipAddress !== filter.ipAddress) {
            return null;
          }

          return {
            id: log.id,
            userId: log.userId,
            user: log.user,
            action: details.action,
            resource: details.resource,
            resourceId: log.resourceId,
            practiceId: log.practiceId,
            allowed: details.allowed,
            reason: details.reason,
            ipAddress: details.ipAddress,
            userAgent: details.userAgent,
            metadata: details,
            timestamp: log.createdAt,
          };
        } catch (error) {
          console.error('Error parsing audit log:', error);
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(filter: Partial<AuditLogFilter> = {}) {
    const where: any = {
      action: 'PERMISSION_CHECK',
    };

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.practiceId) {
      where.practiceId = filter.practiceId;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const logs = await this.prisma.log.findMany({
      where,
      select: {
        details: true,
        createdAt: true,
      },
    });

    const stats = {
      total: logs.length,
      allowed: 0,
      denied: 0,
      byAction: {} as Record<string, number>,
      byResource: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      timeRange: {
        start: filter.startDate || new Date(0),
        end: filter.endDate || new Date(),
      },
    };

    logs.forEach((log) => {
      try {
        const details = JSON.parse(log.details || '{}');

        if (details.allowed) {
          stats.allowed++;
        } else {
          stats.denied++;
        }

        if (details.action) {
          stats.byAction[details.action] =
            (stats.byAction[details.action] || 0) + 1;
        }

        if (details.resource) {
          stats.byResource[details.resource] =
            (stats.byResource[details.resource] || 0) + 1;
        }
      } catch (error) {
        console.error('Error parsing audit log for stats:', error);
      }
    });

    return stats;
  }

  /**
   * Get failed permission attempts
   */
  async getFailedAttempts(userId?: string, limit = 50) {
    const where: any = {
      action: 'PERMISSION_CHECK',
    };

    if (userId) {
      where.userId = userId;
    }

    const logs = await this.prisma.log.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
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

    return logs
      .map((log) => {
        try {
          const details = JSON.parse(log.details || '{}');

          // Only return failed attempts
          if (details.allowed) {
            return null;
          }

          return {
            id: log.id,
            userId: log.userId,
            user: log.user,
            action: details.action,
            resource: details.resource,
            resourceId: log.resourceId,
            practiceId: log.practiceId,
            reason: details.reason,
            ipAddress: details.ipAddress,
            userAgent: details.userAgent,
            timestamp: log.createdAt,
          };
        } catch (error) {
          console.error('Error parsing failed attempt log:', error);
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.log.deleteMany({
      where: {
        action: 'PERMISSION_CHECK',
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
