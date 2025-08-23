import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientPortalService } from './client-portal.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('client-portal')
@UseGuards(JwtAuthGuard)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientDashboardStats(req.user.sub);
  }

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientProfile(req.user.sub);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body()
    updateData: {
      name?: string;
      phone?: string;
      avatar?: string;
    },
  ) {
    return this.clientPortalService.updateClientProfile(
      req.user.sub,
      updateData,
    );
  }

  @Get('cases')
  async getCases(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientCases(req.user.sub);
  }

  @Get('cases/:id')
  async getCase(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientCase(id, req.user.sub);
  }

  @Get('documents')
  async getDocuments(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientDocuments(req.user.sub);
  }

  @Get('documents/:id')
  async getDocument(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientPortalService.getClientDocument(id, req.user.sub);
  }

  @Get('billing')
  async getBillingRecords(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientBillingRecords(req.user.sub);
  }

  @Get('bills')
  async getBills(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientBills(req.user.sub);
  }

  @Get('billing/:id')
  async getBillingRecord(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientPortalService.getClientBillingRecord(id, req.user.sub);
  }

  @Get('events')
  async getEvents(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientEvents(req.user.sub);
  }

  @Get('video-calls')
  async getVideoCalls(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientVideoCalls(req.user.sub);
  }

  @Get('notifications')
  async getNotifications(@Request() req: AuthenticatedRequest) {
    return this.clientPortalService.getClientNotifications(req.user.sub);
  }
}
