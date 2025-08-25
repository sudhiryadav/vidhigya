"use client";

import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from "../../types/permissions";
import LoadingOverlay from "../LoadingOverlay";

interface ProtectedRouteProps {
  children: React.ReactNode;
  action?: PermissionAction;
  resource?: PermissionResource;
  permissions?: Permission[];
  roles?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({
  children,
  action,
  resource,
  permissions,
  roles,
  requireAll = true,
  fallbackPath = "/unauthorized",
  requireAuth = true,
}: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  const { hasPermission, canAccess, getUserPermissions, isLoading } =
    usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  // Show loading while permissions are being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingOverlay
          isVisible={true}
          title="Loading Permissions"
          message="Please wait while we verify your access permissions..."
          absolute={false}
        />
      </div>
    );
  }

  // Check authentication first
  if (requireAuth && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const checkPermissions = (): boolean => {
    // Check role-based access
    if (roles && roles.length > 0) {
      const userPermissions = getUserPermissions();
      if (!userPermissions) return false;

      const hasRequiredRole =
        roles.includes(userPermissions.role) ||
        (userPermissions.practiceRole &&
          roles.includes(userPermissions.practiceRole));

      if (!hasRequiredRole) return false;
    }

    // Check specific action/resource permission
    if (action && resource) {
      if (!hasPermission(action, resource)) {
        return false;
      }
    }

    // Check multiple permissions
    if (permissions && permissions.length > 0) {
      if (requireAll) {
        // User must have ALL permissions
        return canAccess(permissions);
      } else {
        // User needs ANY of the permissions
        return permissions.some((permission) =>
          hasPermission(permission.action, permission.resource)
        );
      }
    }

    return true;
  };

  const hasAccess = checkPermissions();

  if (!hasAccess) {
    router.replace(fallbackPath);
    return null;
  }

  return <>{children}</>;
};

// Convenience components for common route protections
export const AdminRoute = ({
  children,
  fallbackPath = "/unauthorized",
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) => (
  <ProtectedRoute roles={["SUPER_ADMIN", "ADMIN"]} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export const SuperAdminRoute = ({
  children,
  fallbackPath = "/unauthorized",
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) => (
  <ProtectedRoute roles={["SUPER_ADMIN"]} fallbackPath={fallbackPath}>
    {children}
  </ProtectedRoute>
);

export const LawyerRoute = ({
  children,
  fallbackPath = "/unauthorized",
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) => (
  <ProtectedRoute
    roles={["SUPER_ADMIN", "ADMIN", "LAWYER"]}
    fallbackPath={fallbackPath}
    requireAll={false}
  >
    {children}
  </ProtectedRoute>
);

export const CaseAccessRoute = ({
  children,
  fallbackPath = "/unauthorized",
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) => (
  <ProtectedRoute
    action={PermissionAction.READ}
    resource={PermissionResource.CASE}
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const DocumentAccessRoute = ({
  children,
  fallbackPath = "/unauthorized",
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) => (
  <ProtectedRoute
    action={PermissionAction.READ}
    resource={PermissionResource.DOCUMENT}
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);
