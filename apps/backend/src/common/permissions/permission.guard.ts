import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from './permission.decorator';
import { PermissionService } from './permission.service';
import { PermissionResource } from './permission.types';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionService.checkPermission({
        action: permission.action,
        resource: permission.resource,
        resourceId: this.extractResourceId(request, permission.resource),
        userId: user.sub,
        practiceId: this.extractPracticeId(request),
      });

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions: ${permission.action} on ${permission.resource}`,
        );
      }
    }

    return true;
  }

  /**
   * Extract resource ID from request based on resource type
   */
  private extractResourceId(
    request: any,
    resource: PermissionResource,
  ): string | undefined {
    const { params, body } = request;

    switch (resource) {
      case PermissionResource.CASE:
        return params?.caseId || params?.id;
      case PermissionResource.CLIENT:
        return params?.clientId || params?.id;
      case PermissionResource.DOCUMENT:
        return params?.documentId || params?.id;
      case PermissionResource.BILLING:
        return params?.billingId || params?.id;
      case PermissionResource.CALENDAR:
        return params?.eventId || params?.id;
      case PermissionResource.TASK:
        return params?.taskId || params?.id;
      case PermissionResource.USER:
        return params?.userId || params?.id;
      default:
        return params?.id;
    }
  }

  /**
   * Extract practice ID from request
   */
  private extractPracticeId(request: any): string | undefined {
    const { params, body, query } = request;

    // Check various possible locations for practiceId
    return (
      params?.practiceId ||
      body?.practiceId ||
      query?.practiceId ||
      body?.practice?.id ||
      request.user?.primaryPracticeId
    );
  }
}
