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
import { CasesService, CreateCaseDto, UpdateCaseDto } from './cases.service';

// Define proper types for request objects
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    [key: string]: any;
  };
}

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  create(
    @Body() createCaseDto: CreateCaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    createCaseDto.assignedLawyerId = req.user.sub;
    return this.casesService.create(createCaseDto);
  }

  @Get()
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
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.casesService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.casesService.update(id, updateCaseDto, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.casesService.remove(id, req.user.sub);
  }

  // Case Notes endpoints
  @Post(':caseId/notes')
  createCaseNote(
    @Param('caseId') caseId: string,
    @Body() data: { content: string; type: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.casesService.createNote({
      content: data.content,
      type: data.type as NoteType,
      caseId,
      userId: req.user.sub,
    });
  }

  @Get(':caseId/notes')
  getCaseNotes(
    @Param('caseId') caseId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.casesService.findCaseNotes(caseId, req.user.sub);
  }
}
