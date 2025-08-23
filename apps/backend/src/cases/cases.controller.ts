import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { NoteType } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
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
} from '../common/permissions';
import { CasesService, CreateCaseDto, UpdateCaseDto } from './cases.service';

// Define proper types for request objects
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    [key: string]: any;
  };
}

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @RequireCreate(PermissionResource.CASE)
  create(
    @Body() createCaseDto: CreateCaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    createCaseDto.assignedLawyerId = req.user.sub;
    return this.casesService.create(createCaseDto);
  }

  @Get()
  @RequireRead(PermissionResource.CASE)
  findAll(@Request() req: AuthenticatedRequest) {
    return this.casesService.findAll(req.user.sub);
  }

  @Get('dashboard')
  getDashboardStats(@Request() req: AuthenticatedRequest) {
    return this.casesService.getDashboardStats(req.user.sub);
  }

  @Get('overdue-bills')
  getOverdueBills(@Request() req: AuthenticatedRequest) {
    return this.casesService.getOverdueBills(req.user.sub);
  }

  @Get('recent-activity')
  getRecentActivity(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.casesService.getRecentActivity(req.user.sub, limitNum);
  }

  @Get('clients/all')
  getClients(@Request() req: AuthenticatedRequest) {
    return this.casesService.getClients(req.user.sub);
  }

  @Get('clients/:clientId')
  getClientDetails(
    @Param('clientId') clientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.casesService.getClientDetails(clientId, req.user.sub);
  }

  @Get(':id')
  @RequireRead(PermissionResource.CASE)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.casesService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @RequireOwnResource(PermissionAction.UPDATE, PermissionResource.CASE)
  update(
    @Param('id') id: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.casesService.update(id, updateCaseDto, req.user.sub);
  }

  @Delete(':id')
  @RequireDelete(PermissionResource.CASE)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.casesService.remove(id, req.user.sub);
  }

  // Case Notes endpoints
  @Post(':caseId/notes')
  @RequireCreate(PermissionResource.CASE)
  createCaseNote(
    @Param('caseId') caseId: string,
    @Body() data: { content: string; type: string },
    @Request() req: AuthenticatedRequest,
  ) {
    // TODO: Get practiceId from user's current practice context
    const practiceId = 'temp-practice-id'; // This should come from user context
    return this.casesService.createNote({
      content: data.content,
      type: data.type as NoteType,
      caseId,
      userId: req.user.sub,
      practiceId,
    });
  }

  @Get(':caseId/notes')
  @RequireRead(PermissionResource.CASE)
  getCaseNotes(
    @Param('caseId') caseId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.casesService.findCaseNotes(caseId, req.user.sub);
  }
}
