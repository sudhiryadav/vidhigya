import {
  Permission,
  PermissionAction,
  PermissionResource,
  RolePermissions,
} from './permission.types';

// System-level role permissions
export const SYSTEM_ROLE_PERMISSIONS: RolePermissions[] = [
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
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.BILLING,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CALENDAR,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.TASK,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.REPORT,
        scope: 'ALL',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.ANALYTICS,
        scope: 'ALL',
      },
    ],
    description: 'Full system access with no restrictions',
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
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
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
    ],
    description: 'Full practice management with limited system access',
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
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
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
    ],
    description:
      'Full case and client management within practice, can create new practices',
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

// Practice-level role permissions
export const PRACTICE_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'OWNER',
    permissions: [
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
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
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
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.REPORT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.ANALYTICS,
        scope: 'PRACTICE',
      },
    ],
    description: 'Full practice ownership and management',
  },
  {
    role: 'PARTNER',
    permissions: [
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CASE,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.CLIENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.MANAGE,
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
    ],
    description: 'Full practice management without ownership rights',
  },
  {
    role: 'SENIOR_ASSOCIATE',
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
    description: 'Advanced case and document management',
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
    role: 'SUPPORT',
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
        action: PermissionAction.READ,
        resource: PermissionResource.TASK,
        scope: 'PRACTICE',
      },
    ],
    description: 'Read-only access to practice information',
  },
  {
    role: 'STAFF',
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
        action: PermissionAction.READ,
        resource: PermissionResource.DOCUMENT,
        scope: 'PRACTICE',
      },
      {
        action: PermissionAction.READ,
        resource: PermissionResource.CALENDAR,
        scope: 'PRACTICE',
      },
    ],
    description: 'Basic read access to practice information',
  },
];

// Helper function to get permissions for a specific role
export function getRolePermissions(
  role: string,
  isPracticeRole: boolean = false,
): Permission[] {
  const permissions = isPracticeRole
    ? PRACTICE_ROLE_PERMISSIONS
    : SYSTEM_ROLE_PERMISSIONS;
  const rolePermissions = permissions.find((rp) => rp.role === role);
  return rolePermissions ? rolePermissions.permissions : [];
}

// Helper function to check if a role has a specific permission
export function hasPermission(
  role: string,
  action: PermissionAction,
  resource: PermissionResource,
  isPracticeRole: boolean = false,
): boolean {
  const permissions = getRolePermissions(role, isPracticeRole);
  return permissions.some(
    (p) => p.action === action && p.resource === resource,
  );
}
