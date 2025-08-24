# Vidhigya Permission System Documentation

## Overview

This directory contains documentation for the comprehensive Role-Based Access Control (RBAC) system implemented in the Vidhigya legal practice management platform.

## Files

### `permission-matrix.html`

A comprehensive, interactive HTML document that provides a complete visual overview of the permission system. This document includes:

- **System Roles & Permissions Matrix**: Complete table showing what each system role (SUPER_ADMIN, ADMIN, LAWYER, ASSOCIATE, PARALEGAL, CLIENT) can access
- **Practice Roles & Permissions**: Detailed breakdown of practice-specific roles (OWNER, PARTNER, SENIOR_ASSOCIATE, ASSOCIATE, PARALEGAL, SUPPORT, STAFF)
- **Permission Actions & Resources**: Explanation of all available permission actions and resource types
- **Security Features**: Overview of multi-layer security implementation
- **Monitoring & Analytics**: Built-in monitoring capabilities
- **Implementation Benefits**: Key advantages of the system

## Permission System Architecture

### 1. Multi-Layer Security

- **Controller Level**: `@Roles` decorators + `RolesGuard` for basic role validation
- **Service Level**: Practice-level access validation using `validatePracticeAccess` helper methods
- **Resource Level**: Ownership checks for resources with 'OWN' scope
- **Permission Level**: Granular permission checking using `@RequirePermissions` decorators + `PermissionGuard`

### 2. Permission Matrix

The system implements a comprehensive permission matrix with:

- **Permission Actions**: CREATE, READ, UPDATE, DELETE, MANAGE, VIEW, APPROVE, ASSIGN, UPLOAD, DOWNLOAD, EXPORT, IMPORT
- **Permission Resources**: PRACTICE, CASE, CLIENT, DOCUMENT, BILLING, CALENDAR, TASK, USER, REPORT, ANALYTICS, SYSTEM
- **Permission Scopes**: OWN (user's own resources), PRACTICE (within user's practice), ALL (across all practices)

### 3. Role Hierarchy

- **SUPER_ADMIN**: Full system access across all practices, can manage all modules system-wide
- **ADMIN**: Full practice management with enhanced module control, can view all practices but manage only within own practice, can create/edit/delete modules for their practice
- **LAWYER**: Full case and client management within practice, can create new practices
- **ASSOCIATE**: Case management with limited editing permissions
- **PARALEGAL**: Document management and task handling
- **CLIENT**: Access to own case information and documents

### 4. Practice-Level Roles

- **OWNER**: Full practice ownership and management
- **PARTNER**: Full practice management without ownership rights
- **SENIOR_ASSOCIATE**: Advanced case and document management
- **ASSOCIATE**: Case management with limited editing permissions
- **PARALEGAL**: Document management and task handling
- **SUPPORT**: Read-only access to practice information
- **STAFF**: Basic read access to practice information

## Implementation Details

### Backend Components

- `PermissionService`: Core permission checking logic
- `PermissionGuard`: NestJS guard for enforcing permissions
- `PermissionCacheService`: In-memory caching for performance
- `PermissionAuditService`: Comprehensive audit logging
- `PermissionController`: API endpoints for permission management

### Frontend Components

- `PermissionContext`: React context for managing user permissions
- `PermissionGate`: Component for conditional rendering based on permissions
- `ProtectedButton`: Permission-aware button component
- `ProtectedRoute`: Route protection based on permissions
- `PermissionBasedNavigation`: Dynamic navigation based on user permissions

### Key Features

- **High Performance**: 30-minute TTL caching with automatic cleanup
- **Comprehensive Auditing**: Every permission check is logged with metadata
- **Type Safety**: Full TypeScript support with strict typing
- **Developer Friendly**: Simple decorators and reusable components
- **Multi-tenant**: Strict practice isolation with configurable cross-practice access
- **Module Management**: Dynamic navigation module control for admins
- **Practice-Level Control**: ADMIN users can manage modules within their practice
- **System-Wide Control**: SUPER_ADMIN can manage all modules across all practices

## Usage Examples

### Backend Permission Checking

```typescript
@RequireCreate(PermissionResource.CASE)
@RequireRead(PermissionResource.DOCUMENT)
@RequireUpdate(PermissionResource.BILLING)
@RequireDelete(PermissionResource.CALENDAR)
@RequireOwnResource(PermissionResource.TASK)
```

### Frontend Permission Checking

```typescript
const { hasPermission } = usePermissions();

if (hasPermission(PermissionAction.CREATE, PermissionResource.CASE)) {
  // Show create case button
}

<PermissionGate action={PermissionAction.READ} resource={PermissionResource.DOCUMENT}>
  <DocumentList />
</PermissionGate>
```

## Security Considerations

1. **Practice Isolation**: Users cannot access resources outside their practice (except SUPER_ADMIN)
2. **Resource Ownership**: Resources with 'OWN' scope require ownership validation
3. **Audit Trail**: All permission checks are logged for compliance and security monitoring
4. **Cache Security**: Permission cache is automatically invalidated on role changes
5. **Multi-level Validation**: Permissions are checked at multiple levels for defense in depth

## Performance Features

- **Permission Caching**: 30-minute TTL with automatic cleanup
- **Batch Operations**: Efficient bulk permission checking
- **Async Processing**: Non-blocking audit logging
- **Database Optimization**: Selective loading of permission data

## Monitoring & Analytics

The system provides built-in monitoring capabilities:

- Permission usage statistics
- Failed access attempts tracking
- Cache performance metrics
- User activity patterns
- Practice-level analytics

## Compliance & Auditing

- **Comprehensive Logging**: Every permission check is recorded
- **Audit Trail**: Complete history of access attempts
- **Compliance Ready**: Meets enterprise security requirements
- **Real-time Monitoring**: Instant detection of security incidents

## Future Enhancements

- **Dynamic Permission Updates**: Real-time permission changes without restart
- **Advanced Role Inheritance**: Complex role hierarchies and inheritance
- **Conditional Permissions**: Time-based and context-aware permissions
- **Integration APIs**: Third-party permission system integration

---

_This documentation is automatically generated and reflects the current state of the permission system. For technical questions, refer to the source code in `src/common/permissions/` directory._
