import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}
