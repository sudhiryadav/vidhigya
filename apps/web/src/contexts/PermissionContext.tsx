"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "../services/api";
import {
  Permission,
  PermissionAction,
  PermissionCheck,
  PermissionResource,
  PermissionState,
  UserPermissions,
} from "../types/permissions";
import { useAuth } from "./AuthContext";

interface PermissionContextType extends PermissionState {
  hasPermission: (
    action: PermissionAction,
    resource: PermissionResource,
    resourceId?: string
  ) => boolean;
  checkPermission: (check: PermissionCheck) => boolean;
  canAccess: (requiredPermissions: Permission[]) => boolean;
  getUserPermissions: () => UserPermissions | null;
  refreshPermissions: () => Promise<void>;
  isAllowed: (
    action: PermissionAction,
    resource: PermissionResource,
    scope?: "OWN" | "PRACTICE" | "ALL"
  ) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

// Fallback permissions for when the backend is not available
const createFallbackPermissions = (userRole: string): UserPermissions => ({
  userId: "fallback",
  role: userRole,
  practiceRole: undefined,
  permissions: [
    // Allow basic access for all roles
    {
      action: PermissionAction.READ,
      resource: PermissionResource.CASE,
      scope: "PRACTICE",
    },
    {
      action: PermissionAction.READ,
      resource: PermissionResource.CLIENT,
      scope: "PRACTICE",
    },
    {
      action: PermissionAction.READ,
      resource: PermissionResource.DOCUMENT,
      scope: "PRACTICE",
    },
    {
      action: PermissionAction.READ,
      resource: PermissionResource.BILLING,
      scope: "PRACTICE",
    },
    {
      action: PermissionAction.READ,
      resource: PermissionResource.CALENDAR,
      scope: "PRACTICE",
    },
    {
      action: PermissionAction.READ,
      resource: PermissionResource.TASK,
      scope: "PRACTICE",
    },
  ],
  inheritedPermissions: [],
});

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PermissionState>({
    permissions: null,
    isLoading: true,
    error: null,
  });

  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const loadPermissions = useCallback(async () => {
    // Wait for authentication to complete
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setState((prev) => ({ ...prev, isLoading: false, permissions: null }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      console.log("Loading permissions for user:", user.id, user.role);

      // Call backend API to get user permissions
      const response = await apiClient.getCurrentUserPermissions();
      console.log("Permissions response:", response);

      const permissions = response as UserPermissions;

      setState({
        permissions,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to load permissions, using fallback:", error);

      // Use fallback permissions instead of failing
      const fallbackPermissions = createFallbackPermissions(user.role);

      setState({
        permissions: fallbackPermissions,
        isLoading: false,
        error: "Using fallback permissions - backend not available",
      });
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    console.log("PermissionProvider: useEffect triggered", {
      authLoading,
      isAuthenticated,
      userId: user?.id,
      userRole: user?.role,
    });
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback(
    (
      action: PermissionAction,
      resource: PermissionResource,
      resourceId?: string
    ): boolean => {
      if (!state.permissions) {
        // If permissions haven't loaded yet, allow access temporarily
        // This prevents the app from crashing while permissions are loading
        console.warn("Permissions not loaded yet, temporarily allowing access");
        return true;
      }

      // Check if user has the specific permission
      const hasDirectPermission = state.permissions.permissions.some(
        (permission) =>
          (permission.action === action ||
            permission.action === PermissionAction.MANAGE) &&
          permission.resource === resource
      );

      // For SUPER_ADMIN, allow everything
      if (state.permissions.role === "SUPER_ADMIN") return true;

      return hasDirectPermission;
    },
    [state.permissions]
  );

  const checkPermission = useCallback(
    (check: PermissionCheck): boolean => {
      return hasPermission(check.action, check.resource, check.resourceId);
    },
    [hasPermission]
  );

  const canAccess = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      if (!state.permissions) {
        // If permissions haven't loaded yet, allow access temporarily
        console.warn("Permissions not loaded yet, temporarily allowing access");
        return true;
      }

      // User must have ALL required permissions
      return requiredPermissions.every((required) =>
        hasPermission(required.action, required.resource)
      );
    },
    [state.permissions, hasPermission]
  );

  const getUserPermissions = useCallback((): UserPermissions | null => {
    return state.permissions;
  }, [state.permissions]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    await loadPermissions();
  }, [loadPermissions]);

  const isAllowed = useCallback(
    (
      action: PermissionAction,
      resource: PermissionResource,
      scope?: "OWN" | "PRACTICE" | "ALL"
    ): boolean => {
      if (!state.permissions) {
        // If permissions haven't loaded yet, allow access temporarily
        console.warn("Permissions not loaded yet, temporarily allowing access");
        return true;
      }

      const permission = state.permissions.permissions.find(
        (p) =>
          (p.action === action || p.action === PermissionAction.MANAGE) &&
          p.resource === resource &&
          (!scope || p.scope === scope || p.scope === "ALL")
      );

      return !!permission;
    },
    [state.permissions]
  );

  const value: PermissionContextType = {
    ...state,
    hasPermission,
    checkPermission,
    canAccess,
    getUserPermissions,
    refreshPermissions,
    isAllowed,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }

  // If permissions are still loading, return a safe default
  if (context.isLoading) {
    return {
      ...context,
      hasPermission: () => true, // Temporarily allow access while loading
      canAccess: () => true,
      checkPermission: () => true,
      isAllowed: () => true,
    };
  }

  return context;
};

// Convenience hooks for common permission checks
export const useCanCreate = (resource: PermissionResource) => {
  const { hasPermission } = usePermissions();
  return hasPermission(PermissionAction.CREATE, resource);
};

export const useCanRead = (resource: PermissionResource) => {
  const { hasPermission } = usePermissions();
  return hasPermission(PermissionAction.READ, resource);
};

export const useCanUpdate = (
  resource: PermissionResource,
  resourceId?: string
) => {
  const { hasPermission } = usePermissions();
  return hasPermission(PermissionAction.UPDATE, resource, resourceId);
};

export const useCanDelete = (
  resource: PermissionResource,
  resourceId?: string
) => {
  const { hasPermission } = usePermissions();
  return hasPermission(PermissionAction.DELETE, resource, resourceId);
};

export const useCanManage = (resource: PermissionResource) => {
  const { hasPermission } = usePermissions();
  return hasPermission(PermissionAction.MANAGE, resource);
};
