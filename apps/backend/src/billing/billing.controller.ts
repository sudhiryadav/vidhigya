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
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  create(
    @Body() createBillingRecordDto: CreateBillingRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    createBillingRecordDto.userId = req.user.sub;
    return this.billingService.create(createBillingRecordDto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.billingService.findAll(req.user.sub);
  }

  @Get('overdue')
  getOverdueBills(@Request() req: AuthenticatedRequest) {
    return this.billingService.getOverdueBills(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.billingService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBillingRecordDto: UpdateBillingRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.billingService.update(id, updateBillingRecordDto, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.billingService.remove(id, req.user.sub);
  }

  @Post(':id/mark-paid')
  markAsPaid(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.billingService.markAsPaid(id, req.user.sub);
  }
}
