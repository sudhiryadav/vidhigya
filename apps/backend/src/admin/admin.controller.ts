import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
}
