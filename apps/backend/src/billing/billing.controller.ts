import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  PermissionAction,
  PermissionGuard,
  PermissionResource,
  RequireCreate,
  RequireDelete,
  RequireOwnResource,
  RequireRead,
  RequireUpdate,
} from '../common/permissions';
import {
  BillingService,
  CreateBillingRecordDto,
  UpdateBillingRecordDto,
} from './billing.service';

// Define proper types for request objects
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    [key: string]: any;
  };
}

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @RequireCreate(PermissionResource.BILLING)
  create(
    @Body() createBillingRecordDto: CreateBillingRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    createBillingRecordDto.userId = req.user.sub;
    return this.billingService.create(createBillingRecordDto);
  }

  @Get()
  @RequireRead(PermissionResource.BILLING)
  findAll(@Request() req: AuthenticatedRequest) {
    return this.billingService.findAll(req.user.sub);
  }

  @Get('overdue')
  getOverdueBills(@Request() req: AuthenticatedRequest) {
    return this.billingService.getOverdueBills(req.user.sub);
  }

  @Get('subscriptions/me')
  @RequireRead(PermissionResource.BILLING)
  getMySubscription(@Request() req: AuthenticatedRequest) {
    return this.billingService.getMySubscription(req.user.sub);
  }

  @Post('subscriptions/checkout')
  @RequireUpdate(PermissionResource.BILLING)
  createSubscriptionCheckout(
    @Request() req: AuthenticatedRequest,
    @Body() data: { plan?: string },
  ) {
    return this.billingService.createRazorpayCheckout(req.user.sub, data?.plan);
  }

  @Get('subscriptions/overview')
  @Roles(UserRole.SUPER_ADMIN)
  getSubscriptionsOverview() {
    return this.billingService.getSubscriptionsOverview();
  }

  @Get(':id')
  @RequireOwnResource(PermissionAction.READ, PermissionResource.BILLING)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.billingService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @RequireOwnResource(PermissionAction.UPDATE, PermissionResource.BILLING)
  update(
    @Param('id') id: string,
    @Body() updateBillingRecordDto: UpdateBillingRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.billingService.update(id, updateBillingRecordDto, req.user.sub);
  }

  @Delete(':id')
  @RequireDelete(PermissionResource.BILLING)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.billingService.remove(id, req.user.sub);
  }

  @Post(':id/mark-paid')
  @RequireUpdate(PermissionResource.BILLING)
  markAsPaid(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.billingService.markAsPaid(id, req.user.sub);
  }
}
