import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentProcessingMonitorService } from '../documents/document-processing-monitor.service';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly documentProcessingMonitorService: DocumentProcessingMonitorService,
  ) {}

  @Get('stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('recent-activity')
  async getRecentActivity() {
    return this.adminService.getRecentActivity(10);
  }

  @Get('lawyers')
  async getLawyers() {
    return this.adminService.getLawyers();
  }

  @Get('document-processing/stats')
  async getDocumentProcessingStats() {
    return this.documentProcessingMonitorService.getProcessingStats();
  }

  @Post('document-processing/health-check')
  async triggerDocumentProcessingHealthCheck() {
    await this.documentProcessingMonitorService.manualHealthCheck();
    return {
      message: 'Document processing health check triggered successfully',
    };
  }

  // New endpoints for admin pages
  @Get('documents')
  async getDocuments(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = { search, status, type };

    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.adminService.getDocuments(filters);
  }

  @Get('billing')
  async getBillingRecords(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = { search, status };

    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.adminService.getBillingRecords(filters);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('reports')
  async getReports() {
    return this.adminService.getReports();
  }

  /**
   * Get all users (SUPER_ADMIN only)
   */
  @Get('users')
  @Roles(UserRole.SUPER_ADMIN)
  async getAllUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('practiceId') practiceId?: string,
  ) {
    const filters: any = { search, role, practiceId };

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    return this.adminService.getAllUsers(filters);
  }

  /**
   * Get practice users (ADMIN can see users in their practice)
   */
  @Get('practice-users')
  async getPracticeUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Req() req: any,
  ) {
    const filters: any = { search, role };

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    // Get current user's practice ID
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to view practice users',
      );
    }

    return this.adminService.getPracticeUsers(
      currentUser.primaryPracticeId,
      filters,
    );
  }

  /**
   * Update user information
   */
  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body()
    updateData: {
      name?: string;
      email?: string;
      phone?: string;
      isActive?: boolean;
      role?: string;
      password?: string;
    },
    @Req() req: any,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    return this.adminService.updateUser(
      id,
      updateData,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  /**
   * Reset user password
   */
  @Post('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @Body() data: { newPassword: string },
    @Req() req: any,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    return this.adminService.resetUserPassword(
      id,
      data.newPassword,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  /**
   * Deactivate user
   */
  @Patch('users/:id/deactivate')
  async deactivateUser(@Param('id') id: string, @Req() req: any) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    return this.adminService.deactivateUser(
      id,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  /**
   * Reactivate user
   */
  @Patch('users/:id/reactivate')
  async reactivateUser(@Param('id') id: string, @Req() req: any) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    return this.adminService.reactivateUser(
      id,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  /**
   * Create new user
   */
  @Post('users')
  async createUser(
    @Body()
    createData: {
      name: string;
      email: string;
      password: string;
      role: string;
      phone?: string;
    },
    @Req() req: any,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    return this.adminService.createUser(
      createData,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }
}
