import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  RequireCreate,
  RequireDelete,
  RequireUpdate,
} from '../common/permissions/permission.decorator';
import { PermissionGuard } from '../common/permissions/permission.guard';
import { PermissionResource } from '../common/permissions/permission.types';
import {
  AddMemberDto,
  CreatePracticeDto,
  UpdateMemberRoleDto,
  UpdatePracticeDto,
} from './dto/practice.dto';
import { PracticesService } from './practices.service';

@Controller('practices')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class PracticesController {
  constructor(private readonly practicesService: PracticesService) {}

  @Post()
  @RequireCreate(PermissionResource.PRACTICE)
  async createPractice(
    @Request() req,
    @Body() createPracticeDto: CreatePracticeDto,
  ) {
    return this.practicesService.createPractice(
      req.user.sub,
      createPracticeDto,
    );
  }

  @Get()
  async getUserPractices(@Request() req) {
    return this.practicesService.getUserPractices(req.user.sub);
  }

  @Get(':id')
  async getPracticeById(@Param('id') id: string, @Request() req) {
    return this.practicesService.getPracticeById(id, req.user.sub);
  }

  @Put(':id')
  @RequireUpdate(PermissionResource.PRACTICE)
  async updatePractice(
    @Param('id') id: string,
    @Request() req,
    @Body() updatePracticeDto: UpdatePracticeDto,
  ) {
    return this.practicesService.updatePractice(
      id,
      req.user.sub,
      updatePracticeDto,
    );
  }

  @Post(':id/members')
  @RequireCreate(PermissionResource.USER)
  async addMember(
    @Param('id') id: string,
    @Request() req,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.practicesService.addMember(id, req.user.sub, addMemberDto);
  }

  @Put(':id/members/:memberId/role')
  @RequireUpdate(PermissionResource.USER)
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.practicesService.updateMemberRole(
      id,
      req.user.sub,
      memberId,
      updateMemberRoleDto,
    );
  }

  @Delete(':id/members/:memberId')
  @RequireDelete(PermissionResource.USER)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.practicesService.removeMember(id, req.user.sub, memberId);
  }

  @Get(':id/stats')
  async getPracticeStats(@Param('id') id: string, @Request() req) {
    return this.practicesService.getPracticeStats(id, req.user.sub);
  }
}
