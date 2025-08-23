export enum PermissionAction {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  MANAGE = "MANAGE", // Full CRUD access
  VIEW = "VIEW", // Read-only access
  APPROVE = "APPROVE",
  ASSIGN = "ASSIGN",
  UPLOAD = "UPLOAD",
  DOWNLOAD = "DOWNLOAD",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
}

export enum PermissionResource {
  PRACTICE = "PRACTICE",
  CASE = "CASE",
  CLIENT = "CLIENT",
  DOCUMENT = "DOCUMENT",
  BILLING = "BILLING",
  CALENDAR = "CALENDAR",
  TASK = "TASK",
  USER = "USER",
  REPORT = "REPORT",
  ANALYTICS = "ANALYTICS",
  SYSTEM = "SYSTEM",
}

export interface Permission {
  action: PermissionAction;
  resource: PermissionResource;
  scope: "OWN" | "PRACTICE" | "ALL";
  conditions?: string[];
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
  userId?: string;
  practiceId?: string;
}

// Frontend-specific permission helpers
export interface PermissionState {
  permissions: UserPermissions | null;
  isLoading: boolean;
  error: string | null;
}

// UI Permission Configuration
export interface UIPermission {
  resource: PermissionResource;
  actions: PermissionAction[];
  requiredScope?: "OWN" | "PRACTICE" | "ALL";
  fallbackComponent?: React.ComponentType;
}

// Navigation Permission
export interface NavigationPermission {
  path: string;
  requiredPermissions: Permission[];
  roles?: string[];
  hidden?: boolean;
}

// Button/Action Permission
export interface ActionPermission {
  action: PermissionAction;
  resource: PermissionResource;
  disabled?: boolean;
  hidden?: boolean;
  tooltip?: string;
}

// Data filtering
export interface DataFilterPermission {
  resource: PermissionResource;
  fields?: string[];
  scope: "OWN" | "PRACTICE" | "ALL";
}

// Role definitions for frontend
export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  LAWYER: "LAWYER",
  ASSOCIATE: "ASSOCIATE",
  PARALEGAL: "PARALEGAL",
  CLIENT: "CLIENT",
} as const;

export const PRACTICE_ROLES = {
  OWNER: "OWNER",
  PARTNER: "PARTNER",
  SENIOR_ASSOCIATE: "SENIOR_ASSOCIATE",
  ASSOCIATE: "ASSOCIATE",
  PARALEGAL: "PARALEGAL",
  SUPPORT: "SUPPORT",
  STAFF: "STAFF",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type PracticeRole = (typeof PRACTICE_ROLES)[keyof typeof PRACTICE_ROLES];
