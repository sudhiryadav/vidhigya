"use client";

import React from "react";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from "../../types/permissions";

interface PermissionGateProps {
  children: React.ReactNode;
  action?: PermissionAction;
  resource?: PermissionResource;
  permissions?: Permission[];
  fallback?: React.ReactNode;
  roles?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  action,
  resource,
  permissions,
  fallback = null,
  roles,
  requireAll = true,
}) => {
  const { hasPermission, canAccess, getUserPermissions } = usePermissions();

  // Check role-based access
  if (roles && roles.length > 0) {
    const userPermissions = getUserPermissions();
    if (!userPermissions) return <>{fallback}</>;

    const hasRequiredRole =
      roles.includes(userPermissions.role) ||
      (userPermissions.practiceRole &&
        roles.includes(userPermissions.practiceRole));

    if (!hasRequiredRole) return <>{fallback}</>;
  }

  // Check specific action/resource permission
  if (action && resource) {
    if (!hasPermission(action, resource)) {
      return <>{fallback}</>;
    }
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      // User must have ALL permissions
      if (!canAccess(permissions)) {
        return <>{fallback}</>;
      }
    } else {
      // User needs ANY of the permissions
      const hasAnyPermission = permissions.some((permission) =>
        hasPermission(permission.action, permission.resource)
      );
      if (!hasAnyPermission) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const CanCreate: React.FC<{
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate
    action={PermissionAction.CREATE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanRead: React.FC<{
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate
    action={PermissionAction.READ}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanUpdate: React.FC<{
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate
    action={PermissionAction.UPDATE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanDelete: React.FC<{
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate
    action={PermissionAction.DELETE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanManage: React.FC<{
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate
    action={PermissionAction.MANAGE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

// Role-based gates
export const RequireRole: React.FC<{
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}> = ({ roles, children, fallback, requireAll = false }) => (
  <PermissionGate roles={roles} fallback={fallback} requireAll={requireAll}>
    {children}
  </PermissionGate>
);

// Admin only gate
export const AdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireRole roles={["SUPER_ADMIN", "ADMIN"]} fallback={fallback}>
    {children}
  </RequireRole>
);

// Super admin only gate
export const SuperAdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <RequireRole roles={["SUPER_ADMIN"]} fallback={fallback}>
    {children}
  </RequireRole>
);
