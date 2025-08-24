import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// import { PermissionAuditService } from './permission-audit.service';
import { PermissionCacheService } from './permission-cache.service';
import { ROLE_PERMISSIONS } from './permission.matrix';
import {
  PermissionAction,
  PermissionCheck,
  PermissionResource,
  UserPermissions,
} from './permission.types';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
    // private readonly auditService: PermissionAuditService,
  ) {
    // Start cache cleanup interval
    this.cacheService.startCleanupInterval();
  }

  /**
   * Check if a user has permission to perform an action on a resource
   */
  async checkPermission(
    permissionCheck: PermissionCheck,
    auditData?: { ipAddress?: string; userAgent?: string },
  ): Promise<boolean> {
    const { action, resource, resourceId, userId, practiceId } =
      permissionCheck;

    try {
      // Get user's role and practice information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          primaryPracticeId: true,
          practices: {
            where: { isActive: true },
            select: {
              practiceId: true,
            },
          },
        },
      });

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Get user's role permissions
      const rolePermissions = ROLE_PERMISSIONS.find(
        (rp) => rp.role === user.role,
      );
      if (!rolePermissions) {
        throw new ForbiddenException('Invalid user role');
      }

      // Find the specific permission
      const permission = rolePermissions.permissions.find(
        (p) => p.action === action && p.resource === resource,
      );

      if (!permission) {
        return false; // No permission for this action/resource
      }

      // Check scope-based access
      switch (permission.scope) {
        case 'ALL':
          return true; // Super admin and admin can access everything

        case 'PRACTICE':
          // Check if user has access to the practice
          if (practiceId) {
            // Check if user is a member of this practice
            const isPracticeMember = user.practices.some(
              (p) => p.practiceId === practiceId,
            );
            if (isPracticeMember) {
              return true;
            }
          } else {
            // If no practiceId specified, check if user has any practice access
            if (user.practices.length > 0) {
              return true;
            }
          }
          return false;

        case 'OWN':
          // Check if user owns the resource
          if (resourceId) {
            return await this.checkResourceOwnership(
              userId,
              resource,
              resourceId,
            );
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Permission check failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if a user owns a specific resource
   */
  private async checkResourceOwnership(
    userId: string,
    resource: PermissionResource,
    resourceId: string,
  ): Promise<boolean> {
    if (!resourceId) return false;

    switch (resource) {
      case PermissionResource.CASE:
        const legalCase = await this.prisma.legalCase.findFirst({
          where: {
            id: resourceId,
            OR: [{ assignedLawyerId: userId }, { clientId: userId }],
          },
        });
        return !!legalCase;

      case PermissionResource.DOCUMENT:
        const document = await this.prisma.legalDocument.findFirst({
          where: {
            id: resourceId,
            OR: [
              { uploadedById: userId },
              { case: { assignedLawyerId: userId } },
              { case: { clientId: userId } },
            ],
          },
        });
        return !!document;

      case PermissionResource.BILLING:
        const billing = await this.prisma.billingRecord.findFirst({
          where: {
            id: resourceId,
            OR: [
              { userId },
              { case: { assignedLawyerId: userId } },
              { case: { clientId: userId } },
            ],
          },
        });
        return !!billing;

      case PermissionResource.CALENDAR:
        const calendarEvent = await this.prisma.calendarEvent.findFirst({
          where: {
            id: resourceId,
            OR: [
              { createdById: userId },
              { participants: { some: { userId } } },
            ],
          },
        });
        return !!calendarEvent;

      case PermissionResource.TASK:
        const task = await this.prisma.task.findFirst({
          where: {
            id: resourceId,
            OR: [{ assignedToId: userId }, { createdById: userId }],
          },
        });
        return !!task;

      default:
        return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
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
      throw new ForbiddenException('User not found');
    }

    const rolePermissions = ROLE_PERMISSIONS.find(
      (rp) => rp.role === user.role,
    );
    if (!rolePermissions) {
      throw new ForbiddenException('Invalid user role');
    }

    return {
      userId,
      role: user.role,
      practiceRole: null, // No more practice role
      permissions: rolePermissions.permissions,
      inheritedPermissions: [],
    };
  }

  /**
   * Check if a user can access a specific practice
   */
  async canAccessPractice(
    userId: string,
    practiceId: string,
  ): Promise<boolean> {
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

    if (!user) return false;

    // SUPER_ADMIN and ADMIN can access all practices
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return true;
    }

    // Check if user is a member of this practice
    return user.practices.some((p) => p.practiceId === practiceId);
  }

  /**
   * Get filtered data based on user permissions
   */
  async getFilteredData<T>(
    resource: PermissionResource,
    userId: string,
    practiceId: string,
    baseQuery: any,
  ): Promise<T[]> {
    const canAccessAll = await this.checkPermission({
      action: PermissionAction.READ,
      resource,
      userId,
      practiceId,
    });

    if (canAccessAll) {
      return this.prisma[this.getPrismaModel(resource)].findMany(baseQuery);
    }

    // Apply ownership filters
    const filteredQuery = this.applyOwnershipFilters(
      resource,
      userId,
      practiceId,
      baseQuery,
    );

    return this.prisma[this.getPrismaModel(resource)].findMany(filteredQuery);
  }

  /**
   * Get the Prisma model name for a resource
   */
  private getPrismaModel(resource: PermissionResource): string {
    const modelMap: Record<PermissionResource, string> = {
      [PermissionResource.USER]: 'user',
      [PermissionResource.PRACTICE]: 'practice',
      [PermissionResource.CASE]: 'legalCase',
      [PermissionResource.CLIENT]: 'client',
      [PermissionResource.DOCUMENT]: 'legalDocument',
      [PermissionResource.BILLING]: 'billingRecord',
      [PermissionResource.CALENDAR]: 'calendarEvent',
      [PermissionResource.TASK]: 'task',
      [PermissionResource.REPORT]: 'report',
      [PermissionResource.ANALYTICS]: 'analytics',
      [PermissionResource.SYSTEM]: 'system',
      [PermissionResource.MODULE]: 'module',
    };

    return modelMap[resource] || 'user';
  }

  /**
   * Apply ownership filters to a query
   */
  private applyOwnershipFilters(
    resource: PermissionResource,
    userId: string,
    practiceId: string,
    baseQuery: any,
  ): any {
    const filters = {
      ...baseQuery,
      where: {
        ...baseQuery.where,
        practiceId,
      },
    };

    switch (resource) {
      case PermissionResource.CASE:
        filters.where.OR = [{ assignedLawyerId: userId }, { clientId: userId }];
        break;

      case PermissionResource.DOCUMENT:
        filters.where.OR = [
          { uploadedById: userId },
          { case: { assignedLawyerId: userId } },
          { case: { clientId: userId } },
        ];
        break;

      case PermissionResource.BILLING:
        filters.where.OR = [
          { userId },
          { case: { assignedLawyerId: userId } },
          { case: { clientId: userId } },
        ];
        break;

      case PermissionResource.CALENDAR:
        filters.where.OR = [
          { createdById: userId },
          { participants: { some: { userId } } },
        ];
        break;

      case PermissionResource.TASK:
        filters.where.OR = [{ assignedToId: userId }, { createdById: userId }];
        break;
    }

    return filters;
  }

  /**
   * Invalidate user permissions cache
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    await this.cacheService.delete(userId);
  }

  /**
   * Invalidate practice permissions cache
   */
  async invalidatePracticePermissions(practiceId: string): Promise<void> {
    await this.cacheService.invalidatePracticeUsers(practiceId);
  }

  /**
   * Clear all permissions cache
   */
  async clearAllPermissionsCache(): Promise<void> {
    await this.cacheService.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Get audit logs (temporarily disabled)
   */
  async getAuditLogs(filter: any = {}) {
    // Temporarily disabled
    return [];
  }

  /**
   * Get permission statistics (temporarily disabled)
   */
  async getPermissionStats(filter: any = {}) {
    // Temporarily disabled
    return {
      totalChecks: 0,
      allowedChecks: 0,
      deniedChecks: 0,
      successRate: 0,
    };
  }

  /**
   * Get failed permission attempts (temporarily disabled)
   */
  async getFailedAttempts(userId?: string, limit = 50) {
    // Temporarily disabled
    return [];
  }

  /**
   * Clean up old audit logs (temporarily disabled)
   */
  async cleanupOldLogs(daysToKeep = 90) {
    // Temporarily disabled
    return;
  }
}
