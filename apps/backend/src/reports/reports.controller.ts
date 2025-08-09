import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboardReport(
    @Request() req,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    return this.reportsService.getDashboardReport(req.user.sub, period);
  }

  @Get('ai-usage')
  async getAIUsageAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getAIUsageAnalytics(req.user.sub, start, end);
  }

  @Get('feedback')
  async getFeedbackAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getFeedbackAnalytics(req.user.sub, start, end);
  }

  @Get('productivity')
  async getProductivityMetrics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getProductivityMetrics(req.user.sub, start, end);
  }

  @Get('case/:caseId')
  async getCaseSpecificAnalytics(
    @Request() req,
    @Param('caseId') caseId: string,
  ) {
    return this.reportsService.getCaseSpecificAnalytics(req.user.sub, caseId);
  }

  @Get('recent-activity')
  async getRecentActivity(
    @Request() req,
    @Query('limit') limit: string = '10',
  ) {
    return this.reportsService.getRecentActivity(req.user.sub, parseInt(limit));
  }

  // Admin endpoints for team-wide analytics
  @Get('admin/team')
  @Roles(UserRole.ADMIN)
  getTeamAnalytics() {
    // TODO: Implement team-wide analytics
    return { message: 'Team analytics endpoint - to be implemented' };
  }

  @Get('admin/users/:userId')
  @Roles(UserRole.ADMIN)
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const [aiUsage, feedback, productivity] = await Promise.all([
      this.reportsService.getAIUsageAnalytics(userId, start, end),
      this.reportsService.getFeedbackAnalytics(userId, start, end),
      this.reportsService.getProductivityMetrics(userId, start, end),
    ]);

    return {
      userId,
      aiUsage,
      feedback,
      productivity,
    };
  }
}
