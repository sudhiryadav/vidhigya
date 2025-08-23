import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionAuditService } from './permission-audit.service';
import { PermissionCacheService } from './permission-cache.service';
import { getRolePermissions, hasPermission } from './permission.matrix';
import {
  Permission,
  PermissionAction,
  PermissionCheck,
  PermissionResource,
  UserPermissions,
} from './permission.types';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
    private readonly auditService: PermissionAuditService,
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

    let hasAccess = false;
    let reason = '';

    try {
      // Get user's system role and practice role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          primaryPracticeId: true,
          practices: {
            where: { isActive: true },
            select: {
              role: true,
              practiceId: true,
            },
          },
        },
      });

      if (!user) {
        reason = 'User not found';
        throw new ForbiddenException('User not found');
      }

      // Check system-level permissions first
      if (hasPermission(user.role, action, resource, false)) {
        // For SUPER_ADMIN, allow all actions
        if (user.role === 'SUPER_ADMIN') {
          hasAccess = true;
          reason = 'Super admin access';
          return true;
        }

        // For other system roles, check scope
        const systemPermissions = getRolePermissions(user.role, false);
        const permission = systemPermissions.find(
          (p) => p.action === action && p.resource === resource,
        );

        if (permission?.scope === 'ALL') {
          hasAccess = true;
          reason = 'System-level ALL scope permission';
          return true;
        }

        if (permission?.scope === 'PRACTICE' && practiceId) {
          // Check if user has access to this practice
          const practiceMember = user.practices.find(
            (p) => p.practiceId === practiceId,
          );
          if (practiceMember) {
            hasAccess = true;
            reason = 'System-level PRACTICE scope permission';
            return true;
          } else {
            reason = 'Not a member of the specified practice';
          }
        }
      }

      // Check practice-level permissions
      if (practiceId) {
        const practiceMember = user.practices.find(
          (p) => p.practiceId === practiceId,
        );
        if (
          practiceMember &&
          hasPermission(practiceMember.role, action, resource, true)
        ) {
          const practicePermissions = getRolePermissions(
            practiceMember.role,
            true,
          );
          const permission = practicePermissions.find(
            (p) => p.action === action && p.resource === resource,
          );

          if (permission?.scope === 'PRACTICE') {
            hasAccess = true;
            reason = 'Practice-level PRACTICE scope permission';
            return true;
          }

          if (permission?.scope === 'OWN') {
            // Check if the resource belongs to the user
            const ownsResource = await this.checkResourceOwnership(
              resource,
              resourceId,
              userId,
              practiceId,
            );
            if (ownsResource) {
              hasAccess = true;
              reason = 'Practice-level OWN scope permission (owns resource)';
              return true;
            } else {
              reason =
                'Practice-level OWN scope permission but does not own resource';
            }
          }
        } else {
          reason = practiceMember
            ? 'No practice-level permission for this action/resource'
            : 'Not a member of the specified practice';
        }
      } else {
        reason = 'No practice context provided';
      }

      hasAccess = false;
      return false;
    } finally {
      // Log the permission check
      await this.auditService.logPermissionCheck({
        userId,
        action,
        resource,
        resourceId,
        practiceId,
        allowed: hasAccess,
        reason,
        ipAddress: auditData?.ipAddress,
        userAgent: auditData?.userAgent,
      });
    }
  }

  /**
   * Check if a user owns a specific resource
   */
  private async checkResourceOwnership(
    resource: PermissionResource,
    resourceId: string,
    userId: string,
    practiceId: string,
  ): Promise<boolean> {
    if (!resourceId) return false;

    switch (resource) {
      case PermissionResource.CASE:
        const legalCase = await this.prisma.legalCase.findFirst({
          where: {
            id: resourceId,
            practiceId,
            OR: [{ assignedLawyerId: userId }, { clientId: userId }],
          },
        });
        return !!legalCase;

      case PermissionResource.DOCUMENT:
        const document = await this.prisma.legalDocument.findFirst({
          where: {
            id: resourceId,
            practiceId,
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
            practiceId,
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
            practiceId,
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
            practiceId,
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
    // Check cache first
    const cached = await this.cacheService.get(userId);
    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: {
            role: true,
            practiceId: true,
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get system-level permissions
    const systemPermissions = getRolePermissions(user.role, false);

    // Get practice-level permissions
    const practicePermissions = user.practices.flatMap((practice) =>
      getRolePermissions(practice.role, true),
    );

    // Combine and deduplicate permissions
    const allPermissions = [...systemPermissions, ...practicePermissions];
    const uniquePermissions = this.deduplicatePermissions(allPermissions);

    const permissions: UserPermissions = {
      userId,
      role: user.role,
      practiceRole: user.practices[0]?.role,
      permissions: uniquePermissions,
      inheritedPermissions: practicePermissions,
    };

    // Cache the result
    await this.cacheService.set(userId, permissions);

    return permissions;
  }

  /**
   * Deduplicate permissions based on action and resource
   */
  private deduplicatePermissions(permissions: Permission[]): Permission[] {
    const seen = new Set();
    return permissions.filter((permission) => {
      const key = `${permission.action}-${permission.resource}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Check if user can access a practice
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
          where: {
            practiceId,
            isActive: true,
          },
        },
      },
    });

    if (!user) return false;

    // SUPER_ADMIN can access all practices
    if (user.role === 'SUPER_ADMIN') return true;

    // Check if user is a member of the practice
    return user.practices.length > 0;
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
    const modelMap = {
      [PermissionResource.CASE]: 'legalCase',
      [PermissionResource.CLIENT]: 'client',
      [PermissionResource.DOCUMENT]: 'legalDocument',
      [PermissionResource.BILLING]: 'billingRecord',
      [PermissionResource.CALENDAR]: 'calendarEvent',
      [PermissionResource.TASK]: 'task',
      [PermissionResource.USER]: 'user',
    };
    return modelMap[resource] || 'user';
  }

  /**
   * Apply ownership filters to queries
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
   * Invalidate permissions cache for all users in a practice
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
   * Get audit logs
   */
  async getAuditLogs(filter: any = {}) {
    return this.auditService.getAuditLogs(filter);
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(filter: any = {}) {
    return this.auditService.getPermissionStats(filter);
  }

  /**
   * Get failed permission attempts
   */
  async getFailedAttempts(userId?: string, limit = 50) {
    return this.auditService.getFailedAttempts(userId, limit);
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep = 90) {
    return this.auditService.cleanupOldLogs(daysToKeep);
  }
}
