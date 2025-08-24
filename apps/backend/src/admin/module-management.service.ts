import { ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionService } from '../common/permissions/permission.service';
import {
  PermissionAction,
  PermissionResource,
} from '../common/permissions/permission.types';

export interface NavigationModule {
  id: string;
  name: string;
  path: string;
  icon: string;
  isActive: boolean;
  isVisible: boolean;
  order: number;
  practiceId?: string; // null for system-wide modules
  parentModuleId?: string; // for nested modules
  permissions: string[]; // required permissions to access
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateModuleDto {
  name: string;
  path: string;
  icon: string;
  isActive?: boolean;
  isVisible?: boolean;
  order?: number;
  practiceId?: string;
  parentModuleId?: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface UpdateModuleDto extends Partial<CreateModuleDto> {
  id: string;
}

@Injectable()
export class ModuleManagementService {
  constructor(private readonly permissionService: PermissionService) {}

  // In-memory storage for modules (temporary until database table is created)
  private modules: NavigationModule[] = [
    {
      id: '1',
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'Home',
      isActive: true,
      isVisible: true,
      order: 1,
      practiceId: undefined,
      parentModuleId: undefined,
      permissions: ['READ'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Cases',
      path: '/cases',
      icon: 'Briefcase',
      isActive: true,
      isVisible: true,
      order: 2,
      practiceId: undefined,
      parentModuleId: undefined,
      permissions: ['READ'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'Clients',
      path: '/clients',
      icon: 'Users',
      isActive: true,
      isVisible: true,
      order: 3,
      practiceId: undefined,
      parentModuleId: undefined,
      permissions: ['READ'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  /**
   * Create a new navigation module
   */
  async createModule(
    createModuleDto: CreateModuleDto,
    userId: string,
    userRole: string,
  ): Promise<NavigationModule> {
    // Check if user has permission to create modules
    const canCreate = await this.permissionService.checkPermission({
      action: PermissionAction.CREATE,
      resource: PermissionResource.MODULE,
      userId,
      practiceId: createModuleDto.practiceId,
    });

    if (!canCreate) {
      throw new ForbiddenException(
        'Insufficient permissions to create modules',
      );
    }

    // For ADMIN users, ensure they can only create modules for their practice
    if (userRole === 'ADMIN' && !createModuleDto.practiceId) {
      throw new ForbiddenException(
        'ADMIN users can only create practice-specific modules',
      );
    }

    // For SUPER_ADMIN, allow system-wide modules
    if (userRole === 'SUPER_ADMIN' && !createModuleDto.practiceId) {
      // System-wide module
      const newModule: NavigationModule = {
        id: Date.now().toString(),
        name: createModuleDto.name,
        path: createModuleDto.path,
        icon: createModuleDto.icon,
        isActive: createModuleDto.isActive ?? true,
        isVisible: createModuleDto.isVisible ?? true,
        order: createModuleDto.order ?? 0,
        parentModuleId: createModuleDto.parentModuleId,
        permissions: createModuleDto.permissions,
        metadata: createModuleDto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.modules.push(newModule);
      return newModule;
    }

    // Practice-specific module
    const newModule: NavigationModule = {
      id: Date.now().toString(),
      name: createModuleDto.name,
      path: createModuleDto.path,
      icon: createModuleDto.icon,
      isActive: createModuleDto.isActive ?? true,
      isVisible: createModuleDto.isVisible ?? true,
      order: createModuleDto.order ?? 0,
      practiceId: createModuleDto.practiceId,
      parentModuleId: createModuleDto.parentModuleId,
      permissions: createModuleDto.permissions,
      metadata: createModuleDto.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.modules.push(newModule);
    return newModule;
  }

  /**
   * Update an existing navigation module
   */
  async updateModule(
    updateModuleDto: UpdateModuleDto,
    userId: string,
    userRole: string,
  ): Promise<NavigationModule> {
    // Check if user has permission to update modules
    const canUpdate = await this.permissionService.checkPermission({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.MODULE,
      userId,
      practiceId: updateModuleDto.practiceId,
    });

    if (!canUpdate) {
      throw new ForbiddenException(
        'Insufficient permissions to update modules',
      );
    }

    // Get existing module to check practice ownership
    const existingModuleIndex = this.modules.findIndex(
      (m) => m.id === updateModuleDto.id,
    );
    const existingModule = this.modules[existingModuleIndex];

    if (!existingModule) {
      throw new ForbiddenException('Module not found');
    }

    // For ADMIN users, ensure they can only update modules for their practice
    if (userRole === 'ADMIN' && existingModule.practiceId) {
      const canAccessPractice = await this.permissionService.checkPermission({
        action: PermissionAction.UPDATE,
        resource: PermissionResource.MODULE,
        userId,
        practiceId: existingModule.practiceId,
      });

      if (!canAccessPractice) {
        throw new ForbiddenException(
          'Cannot update modules from other practices',
        );
      }
    }

    // Update the module
    const updatedModule: NavigationModule = {
      ...existingModule,
      ...updateModuleDto,
      updatedAt: new Date(),
    };

    this.modules[existingModuleIndex] = updatedModule;
    return updatedModule;
  }

  /**
   * Delete a navigation module
   */
  async deleteModule(
    moduleId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    // Check if user has permission to delete modules
    const canDelete = await this.permissionService.checkPermission({
      action: PermissionAction.DELETE,
      resource: PermissionResource.MODULE,
      userId,
    });

    if (!canDelete) {
      throw new ForbiddenException(
        'Insufficient permissions to delete modules',
      );
    }

    // Get existing module to check practice ownership
    const existingModuleIndex = this.modules.findIndex(
      (m) => m.id === moduleId,
    );
    const existingModule = this.modules[existingModuleIndex];

    if (!existingModule) {
      throw new ForbiddenException('Module not found');
    }

    // For ADMIN users, ensure they can only delete modules for their practice
    if (userRole === 'ADMIN' && existingModule.practiceId) {
      const canAccessPractice = await this.permissionService.checkPermission({
        action: PermissionAction.DELETE,
        resource: PermissionResource.MODULE,
        userId,
        practiceId: existingModule.practiceId,
      });

      if (!canAccessPractice) {
        throw new ForbiddenException(
          'Cannot delete modules from other practices',
        );
      }
    }

    // Remove the module from the array
    this.modules.splice(existingModuleIndex, 1);
  }

  /**
   * Get all modules based on user permissions
   */
  async getModules(
    userId: string,
    userRole: string,
    practiceId?: string,
  ): Promise<NavigationModule[]> {
    // Check if user has permission to read modules
    const canRead = await this.permissionService.checkPermission({
      action: PermissionAction.READ,
      resource: PermissionResource.MODULE,
      userId,
      practiceId,
    });

    if (!canRead) {
      throw new ForbiddenException('Insufficient permissions to view modules');
    }

    let filteredModules = this.modules;

    if (userRole === 'ADMIN') {
      // ADMIN can see their practice modules + system-wide modules
      filteredModules = this.modules.filter(
        (module) => module.practiceId === practiceId || !module.practiceId,
      );
    } else if (userRole === 'SUPER_ADMIN') {
      // SUPER_ADMIN can see all modules
      if (practiceId) {
        filteredModules = this.modules.filter(
          (module) => module.practiceId === practiceId,
        );
      }
      // If no practiceId specified, show all modules
    }

    // Sort by order and name
    return filteredModules.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get a specific module by ID
   */
  async getModuleById(
    moduleId: string,
    userId: string,
    userRole: string,
  ): Promise<NavigationModule> {
    const module = this.modules.find((m) => m.id === moduleId);

    if (!module) {
      throw new ForbiddenException('Module not found');
    }

    // Check if user has permission to read this specific module
    const canRead = await this.permissionService.checkPermission({
      action: PermissionAction.READ,
      resource: PermissionResource.MODULE,
      userId,
      practiceId: module.practiceId,
    });

    if (!canRead) {
      throw new ForbiddenException(
        'Insufficient permissions to view this module',
      );
    }

    return module;
  }

  /**
   * Toggle module visibility/activation
   */
  async toggleModule(
    moduleId: string,
    toggleType: 'visibility' | 'activation',
    userId: string,
    userRole: string,
  ): Promise<NavigationModule> {
    const moduleIndex = this.modules.findIndex((m) => m.id === moduleId);
    const module = this.modules[moduleIndex];

    if (!module) {
      throw new ForbiddenException('Module not found');
    }

    // Check if user has permission to update this module
    const canUpdate = await this.permissionService.checkPermission({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.MODULE,
      userId,
      practiceId: module.practiceId,
    });

    if (!canUpdate) {
      throw new ForbiddenException(
        'Insufficient permissions to update this module',
      );
    }

    // Update the module
    if (toggleType === 'visibility') {
      module.isVisible = !module.isVisible;
    } else if (toggleType === 'activation') {
      module.isActive = !module.isActive;
    }

    module.updatedAt = new Date();
    this.modules[moduleIndex] = module;

    return module;
  }

  /**
   * Reorder modules
   */
  async reorderModules(
    moduleOrders: Array<{ id: string; order: number }>,
    userId: string,
    userRole: string,
    practiceId?: string,
  ): Promise<void> {
    // Check if user has permission to update modules
    const canUpdate = await this.permissionService.checkPermission({
      action: PermissionAction.UPDATE,
      resource: PermissionResource.MODULE,
      userId,
      practiceId,
    });

    if (!canUpdate) {
      throw new ForbiddenException(
        'Insufficient permissions to reorder modules',
      );
    }

    // Update each module's order
    for (const moduleOrder of moduleOrders) {
      const moduleIndex = this.modules.findIndex(
        (m) => m.id === moduleOrder.id,
      );
      if (moduleIndex !== -1) {
        this.modules[moduleIndex].order = moduleOrder.order;
        this.modules[moduleIndex].updatedAt = new Date();
      }
    }
  }
}
