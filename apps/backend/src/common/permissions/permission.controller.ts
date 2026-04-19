import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionService } from './permission.service';
import {
  PermissionAction,
  PermissionCheck,
  PermissionResource,
} from './permission.types';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    [key: string]: any;
  };
}

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Get current user's permissions
   */
  @Get('me')
  async getCurrentUserPermissions(@Request() req: AuthenticatedRequest) {
    return this.permissionService.getUserPermissions(req.user.sub);
  }

  /**
   * Get permissions for a specific user (admin only)
   */
  @Get('user/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionService.getUserPermissions(userId);
  }

  /**
   * Check specific permission
   */
  @Post('check')
  async checkPermission(
    @Body() permissionCheck: PermissionCheck,
    @Request() req: AuthenticatedRequest,
  ) {
    // Use current user if no userId provided
    if (!permissionCheck.userId) {
      permissionCheck.userId = req.user.sub;
    }

    // Extract IP and User Agent for audit
    const auditData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    const hasPermission = await this.permissionService.checkPermission(
      permissionCheck,
      auditData,
    );

    return {
      hasPermission,
      check: permissionCheck,
    };
  }

  /**
   * Batch check multiple permissions
   */
  @Post('check-batch')
  async checkBatchPermissions(
    @Body() body: { checks: PermissionCheck[] },
    @Request() req: AuthenticatedRequest,
  ) {
    const { checks } = body;
    const results = [];

    const auditData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    for (const check of checks) {
      // Use current user if no userId provided
      if (!check.userId) {
        check.userId = req.user.sub;
      }

      const hasPermission = await this.permissionService.checkPermission(
        check,
        auditData,
      );

      results.push({
        check,
        hasPermission,
      });
    }

    return { results };
  }

  /**
   * Check if user can access a practice
   */
  @Get('practice/:practiceId/access')
  async canAccessPractice(
    @Param('practiceId') practiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const canAccess = await this.permissionService.canAccessPractice(
      req.user.sub,
      practiceId,
    );

    return { canAccess, practiceId };
  }

  /**
   * Get audit logs (admin only)
   */
  @Get('audit/logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getAuditLogs(@Query() query: any) {
    const filter = {
      userId: query.userId,
      action: query.action,
      resource: query.resource,
      practiceId: query.practiceId,
      allowed: query.allowed ? query.allowed === 'true' : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      ipAddress: query.ipAddress,
      limit: query.limit ? parseInt(query.limit) : 100,
      offset: query.offset ? parseInt(query.offset) : 0,
    };

    return this.permissionService.getAuditLogs(filter);
  }

  /**
   * Get permission statistics (admin only)
   */
  @Get('audit/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getPermissionStats(@Query() query: any) {
    const filter = {
      userId: query.userId,
      practiceId: query.practiceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.permissionService.getPermissionStats(filter);
  }

  /**
   * Get failed permission attempts (admin only)
   */
  @Get('audit/failures')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getFailedAttempts(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.permissionService.getFailedAttempts(userId, limitNum);
  }

  /**
   * Get cache statistics (super admin only)
   */
  @Get('cache/stats')
  @Roles(UserRole.SUPER_ADMIN)
  getCacheStats() {
    return this.permissionService.getCacheStats();
  }

  /**
   * Clear user permissions cache (admin only)
   */
  @Delete('cache/user/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async clearUserCache(@Param('userId') userId: string) {
    await this.permissionService.invalidateUserPermissions(userId);
    return { message: 'User permissions cache cleared', userId };
  }

  /**
   * Clear practice permissions cache (admin only)
   */
  @Delete('cache/practice/:practiceId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async clearPracticeCache(@Param('practiceId') practiceId: string) {
    await this.permissionService.invalidatePracticePermissions(practiceId);
    return { message: 'Practice permissions cache cleared', practiceId };
  }

  /**
   * Clear all permissions cache (super admin only)
   */
  @Delete('cache/all')
  @Roles(UserRole.SUPER_ADMIN)
  async clearAllCache() {
    await this.permissionService.clearAllPermissionsCache();
    return { message: 'All permissions cache cleared' };
  }

  /**
   * Clean up old audit logs (super admin only)
   */
  @Delete('audit/cleanup')
  @Roles(UserRole.SUPER_ADMIN)
  cleanupAuditLogs(@Query('days') days?: string) {
    const daysToKeep = days ? parseInt(days) : 90;
    this.permissionService.cleanupOldLogs(daysToKeep);
    return {
      message: 'Audit logs cleaned up',
      deletedCount: 0,
      daysToKeep,
    };
  }

  /**
   * Get available permissions matrix (admin only)
   */
  @Get('matrix')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getPermissionMatrix() {
    return {
      actions: Object.values(PermissionAction),
      resources: Object.values(PermissionResource),
      scopes: ['OWN', 'PRACTICE', 'ALL'],
      userRoles: [
        'SUPER_ADMIN',
        'ADMIN',
        'LAWYER',
        'ASSOCIATE',
        'PARALEGAL',
        'CLIENT',
      ],
      practiceRoles: [
        'OWNER',
        'PARTNER',
        'SENIOR_ASSOCIATE',
        'ASSOCIATE',
        'PARALEGAL',
        'SUPPORT',
        'STAFF',
      ],
    };
  }

  /**
   * Refresh user permissions (clears cache and reloads)
   */
  @Post('refresh')
  async refreshPermissions(@Request() req: AuthenticatedRequest) {
    await this.permissionService.invalidateUserPermissions(req.user.sub);
    const permissions = await this.permissionService.getUserPermissions(
      req.user.sub,
    );
    return {
      message: 'Permissions refreshed',
      permissions,
    };
  }
}
