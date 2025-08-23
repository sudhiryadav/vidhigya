import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionResource } from './permission.types';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  action: PermissionAction;
  resource: PermissionResource;
  scope?: 'OWN' | 'PRACTICE' | 'ALL';
}

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Convenience decorators for common permission patterns
export const RequireCreate = (resource: PermissionResource) =>
  RequirePermissions({ action: PermissionAction.CREATE, resource });

export const RequireRead = (resource: PermissionResource) =>
  RequirePermissions({ action: PermissionAction.READ, resource });

export const RequireUpdate = (resource: PermissionResource) =>
  RequirePermissions({ action: PermissionAction.UPDATE, resource });

export const RequireDelete = (resource: PermissionResource) =>
  RequirePermissions({ action: PermissionAction.DELETE, resource });

export const RequireManage = (resource: PermissionResource) =>
  RequirePermissions({ action: PermissionAction.MANAGE, resource });

export const RequireOwnResource = (
  action: PermissionAction,
  resource: PermissionResource,
) => RequirePermissions({ action, resource, scope: 'OWN' });

export const RequirePracticeAccess = (
  action: PermissionAction,
  resource: PermissionResource,
) => RequirePermissions({ action, resource, scope: 'PRACTICE' });
