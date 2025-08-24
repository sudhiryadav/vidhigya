export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE', // Full CRUD access
  VIEW = 'VIEW', // Read-only access
  APPROVE = 'APPROVE',
  ASSIGN = 'ASSIGN',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

export enum PermissionResource {
  PRACTICE = 'PRACTICE',
  CASE = 'CASE',
  CLIENT = 'CLIENT',
  DOCUMENT = 'DOCUMENT',
  BILLING = 'BILLING',
  CALENDAR = 'CALENDAR',
  TASK = 'TASK',
  USER = 'USER',
  REPORT = 'REPORT',
  ANALYTICS = 'ANALYTICS',
  SYSTEM = 'SYSTEM',
  MODULE = 'MODULE', // For managing navigation modules and features
}

export interface Permission {
  action: PermissionAction;
  resource: PermissionResource;
  scope: 'OWN' | 'PRACTICE' | 'ALL';
  conditions?: string[]; // Additional conditions for the permission
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
  description: string;
}

export interface UserPermissions {
  userId: string;
  role: string;
  practiceRole?: string;
  permissions: Permission[];
  inheritedPermissions: Permission[];
}

export interface PermissionCheck {
  action: PermissionAction;
  resource: PermissionResource;
  resourceId?: string;
  userId: string;
  practiceId?: string;
}
