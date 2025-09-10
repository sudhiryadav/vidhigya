"use client";

import React from "react";
import { useAuth } from "../../contexts/AuthContext";
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

export const PermissionGate = ({
  children,
  action,
  resource,
  permissions,
  fallback = null,
  roles,
  requireAll = true,
}: PermissionGateProps) => {
  const { hasPermission, canAccess, getUserPermissions } = usePermissions();
  const { user } = useAuth();

  // Check role-based access
  if (roles && roles.length > 0) {
    if (!user) return <>{fallback}</>;
    const hasRequiredRole = roles.includes(user.role);
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
export const CanCreate = ({
  resource,
  children,
  fallback,
}: {
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <PermissionGate
    action={PermissionAction.CREATE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanRead = ({
  resource,
  children,
  fallback,
}: {
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <PermissionGate
    action={PermissionAction.READ}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanUpdate = ({
  resource,
  children,
  fallback,
}: {
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <PermissionGate
    action={PermissionAction.UPDATE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanDelete = ({
  resource,
  children,
  fallback,
}: {
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <PermissionGate
    action={PermissionAction.DELETE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const CanManage = ({
  resource,
  children,
  fallback,
}: {
  resource: PermissionResource;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <PermissionGate
    action={PermissionAction.MANAGE}
    resource={resource}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

// Role-based gates
export const RequireRole = ({
  roles,
  children,
  fallback,
  requireAll = false,
}: {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean;
}) => (
  <PermissionGate roles={roles} fallback={fallback} requireAll={requireAll}>
    {children}
  </PermissionGate>
);

// Admin only gate
export const AdminOnly = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <RequireRole roles={["SUPER_ADMIN", "ADMIN"]} fallback={fallback}>
    {children}
  </RequireRole>
);

// Super admin only gate
export const SuperAdminOnly = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <RequireRole roles={["SUPER_ADMIN"]} fallback={fallback}>
    {children}
  </RequireRole>
);
