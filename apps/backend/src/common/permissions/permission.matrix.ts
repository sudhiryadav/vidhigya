import {
  Permission,
  PermissionAction,
  PermissionResource,
  RolePermissions,
} from './permission.types';

// Single unified role permissions - no more confusion between UserRole and PracticeRole
export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'SUPER_ADMIN',
    permissions: [
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.SYSTEM,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.PRACTICE,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.USER,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CASE,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CLIENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.BILLING,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CALENDAR,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.TASK,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.TASK,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.REPORT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.REPORT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.ANALYTICS,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.ANALYTICS,
        scope: 'ALL',
      },
    ],
    description:
      'Full system access with no restrictions, can manage all modules across all practices',
  },
  {
    role: 'ADMIN',
    permissions: [
      {
        action: PermissionAction.CREATE,
        resource: PermissionResource.PRACTICE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.PRACTICE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.USER,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.TASK,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.TASK,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.REPORT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.ANALYTICS,
        scope: 'PRACTICE',
      },

      // Cross-practice read access for Admin (can view other practices but not modify)
      {
        action: PermissionAction.READ,
        resource: PermissionResource.PRACTICE,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CLIENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.TASK,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.REPORT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.ANALYTICS,
        scope: 'ALL',
      },
    ],
    description:
      'Full practice management with enhanced module control, can view all practices but manage only within own practice',
  },
  {
    role: 'LAWYER',
    permissions: [
      {
        action: PermissionAction.CREATE,
        resource: PermissionResource.PRACTICE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.TASK,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.TASK,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.REPORT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.ANALYTICS,
        scope: 'PRACTICE',
      },
      // Basic module access for navigation
      {
        action: PermissionAction.READ,
        resource: PermissionResource.MODULE,
        scope: 'PRACTICE',
      },
    ],
    description:
      'Full case and client management within practice, can create new practices, basic module access for navigation',
  },
  {
    role: 'ASSOCIATE',
    permissions: [
      {
        action: PermissionAction.CREATE,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.UPDATE,
        resource: PermissionResource.CASE,
        scope: 'OWN',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.CREATE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.CREATE,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.TASK,
        scope: 'PRACTICE',
      },
    ],
    description: 'Case management with limited editing permissions',
  },
  {
    role: 'PARALEGAL',
    permissions: [
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.CREATE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.TASK,
        scope: 'OWN',
      },
    ],
    description: 'Document management and task handling',
  },
  {
    role: 'CLIENT',
    permissions: [
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CASE,
        scope: 'OWN',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'OWN',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.BILLING,
        scope: 'OWN',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'OWN',
      },
    ],
    description: 'Access to own case information and documents',
  },
];

// Helper function to get permissions for a specific role
export function getRolePermissions(role: string): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS.find((rp) => rp.role === role);
  return rolePermissions ? rolePermissions.permissions : [];
}

// Helper function to check if a role has a specific permission
export function hasPermission(
  role: string,
  action: PermissionAction,
  resource: PermissionResource,
): boolean {
  const permissions = getRolePermissions(role);
  return permissions.some(
    (p) => p.action === action && p.resource === resource,
  );
}
