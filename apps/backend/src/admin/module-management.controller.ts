import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  RequireCreate,
  RequireDelete,
  RequireRead,
  RequireUpdate,
} from '../common/permissions/permission.decorator';
import { PermissionGuard } from '../common/permissions/permission.guard';
import { PermissionResource } from '../common/permissions/permission.types';
import {
  CreateModuleDto,
  ModuleManagementService,
  UpdateModuleDto,
} from './module-management.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
  };
}

@Controller('admin/modules')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class ModuleManagementController {
  constructor(
    private readonly moduleManagementService: ModuleManagementService,
  ) {}

  /**
   * Create a new navigation module
   */
  @Post()
  @RequireCreate(PermissionResource.MODULE)
  async createModule(
    @Body() createModuleDto: CreateModuleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moduleManagementService.createModule(
      createModuleDto,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Get all modules based on user permissions
   */
  @Get()
  @RequireRead(PermissionResource.MODULE)
  async getModules(
    @Request() req: AuthenticatedRequest,
    @Query('practiceId') practiceId?: string,
  ) {
    return this.moduleManagementService.getModules(
      req.user.sub,
      req.user.role,
      practiceId,
    );
  }

  /**
   * Get a specific module by ID
   */
  @Get(':id')
  @RequireRead(PermissionResource.MODULE)
  async getModuleById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moduleManagementService.getModuleById(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Update an existing navigation module
   */
  @Put(':id')
  @RequireUpdate(PermissionResource.MODULE)
  async updateModule(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    updateModuleDto.id = id;
    return this.moduleManagementService.updateModule(
      updateModuleDto,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Delete a navigation module
   */
  @Delete(':id')
  @RequireDelete(PermissionResource.MODULE)
  async deleteModule(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moduleManagementService.deleteModule(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Toggle module visibility
   */
  @Put(':id/toggle-visibility')
  @RequireUpdate(PermissionResource.MODULE)
  async toggleVisibility(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moduleManagementService.toggleModule(
      id,
      'visibility',
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Toggle module activation
   */
  @Put(':id/toggle-activation')
  @RequireUpdate(PermissionResource.MODULE)
  async toggleActivation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moduleManagementService.toggleModule(
      id,
      'activation',
      req.user.sub,
      req.user.role,
    );
  }

  /**
   * Reorder modules
   */
  @Put('reorder')
  @RequireUpdate(PermissionResource.MODULE)
  async reorderModules(
    @Request() req: AuthenticatedRequest,
    @Body() moduleOrders: Array<{ id: string; order: number }>,
    @Query('practiceId') practiceId?: string,
  ) {
    return this.moduleManagementService.reorderModules(
      moduleOrders,
      req.user.sub,
      req.user.role,
      practiceId,
    );
  }

  /**
   * Get system-wide modules (SUPER_ADMIN only)
   */
  @Get('system/all')
  @RequireRead(PermissionResource.MODULE)
  async getSystemModules(@Request() req: AuthenticatedRequest) {
    // Only SUPER_ADMIN can access system-wide modules
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new Error('Only SUPER_ADMIN can access system-wide modules');
    }

    return this.moduleManagementService.getModules(
      req.user.sub,
      req.user.role,
      undefined, // No practiceId means system-wide
    );
  }

  /**
   * Get practice-specific modules
   */
  @Get('practice/:practiceId')
  @RequireRead(PermissionResource.MODULE)
  async getPracticeModules(
    @Param('practiceId') practiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moduleManagementService.getModules(
      req.user.sub,
      req.user.role,
      practiceId,
    );
  }
}
