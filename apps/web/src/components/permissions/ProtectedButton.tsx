"use client";

import React from "react";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from "../../types/permissions";

interface ProtectedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action?: PermissionAction;
  resource?: PermissionResource;
  permissions?: Permission[];
  roles?: string[];
  requireAll?: boolean;
  fallbackText?: string;
  disabledTooltip?: string;
  children: React.ReactNode;
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  action,
  resource,
  permissions,
  roles,
  requireAll = true,
  fallbackText,
  disabledTooltip,
  children,
  disabled: externalDisabled,
  title: externalTitle,
  ...buttonProps
}) => {
  const { hasPermission, canAccess, getUserPermissions } = usePermissions();

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
  const isDisabled = externalDisabled || !hasAccess;
  const buttonTitle =
    externalTitle ||
    (isDisabled && disabledTooltip ? disabledTooltip : undefined);

  return (
    <button
      {...buttonProps}
      disabled={isDisabled}
      title={buttonTitle}
      className={`${buttonProps.className || ""} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {hasAccess ? children : fallbackText || children}
    </button>
  );
};

// Convenience components for common actions
export const CreateButton: React.FC<
  {
    resource: PermissionResource;
    children: React.ReactNode;
    fallbackText?: string;
    disabledTooltip?: string;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">
> = ({
  resource,
  children,
  fallbackText,
  disabledTooltip = `You don't have permission to create ${resource.toLowerCase()}s`,
  ...props
}) => (
  <ProtectedButton
    action={PermissionAction.CREATE}
    resource={resource}
    fallbackText={fallbackText}
    disabledTooltip={disabledTooltip}
    {...props}
  >
    {children}
  </ProtectedButton>
);

export const UpdateButton: React.FC<
  {
    resource: PermissionResource;
    children: React.ReactNode;
    fallbackText?: string;
    disabledTooltip?: string;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">
> = ({
  resource,
  children,
  fallbackText,
  disabledTooltip = `You don't have permission to update ${resource.toLowerCase()}s`,
  ...props
}) => (
  <ProtectedButton
    action={PermissionAction.UPDATE}
    resource={resource}
    fallbackText={fallbackText}
    disabledTooltip={disabledTooltip}
    {...props}
  >
    {children}
  </ProtectedButton>
);

export const DeleteButton: React.FC<
  {
    resource: PermissionResource;
    children: React.ReactNode;
    fallbackText?: string;
    disabledTooltip?: string;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">
> = ({
  resource,
  children,
  fallbackText,
  disabledTooltip = `You don't have permission to delete ${resource.toLowerCase()}s`,
  ...props
}) => (
  <ProtectedButton
    action={PermissionAction.DELETE}
    resource={resource}
    fallbackText={fallbackText}
    disabledTooltip={disabledTooltip}
    {...props}
  >
    {children}
  </ProtectedButton>
);
