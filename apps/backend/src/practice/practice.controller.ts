import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LAWYER)
export class PracticeController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getPracticeUsers(@Req() req: any) {
    return this.adminService.getPracticeUsers(req);
  }

  @Get('users/:id')
  async getPracticeUser(@Param('id') id: string, @Req() req: any) {
    // For now, just return the user from practice users
    const users = await this.adminService.getPracticeUsers(req);
    return users.find((user: any) => user.id === id);
  }

  @Put('users/:id')
  async updatePracticeUser(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    return this.adminService.updateUser(
      id,
      updateData,
      req.user.id,
      req.user.role,
    );
  }

  @Post('users/:id/reset-password')
  async resetPracticeUserPassword(
    @Param('id') id: string,
    @Body() data: { password: string },
    @Req() req: any,
  ) {
    return this.adminService.resetUserPassword(
      id,
      data.password,
      req.user.id,
      req.user.role,
    );
  }

  @Patch('users/:id/deactivate')
  async deactivatePracticeUser(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deactivateUser(id, req.user.id, req.user.role);
  }

  @Patch('users/:id/reactivate')
  async reactivatePracticeUser(@Param('id') id: string, @Req() req: any) {
    return this.adminService.reactivateUser(id, req.user.id, req.user.role);
  }

  @Post('users')
  async createPracticeUser(@Body() createData: any, @Req() req: any) {
    return this.adminService.createUser(createData, req.user.id, req.user.role);
  }
}
