import {
  Body,
  Controller,
  ForbiddenException,
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
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

interface PracticeUserUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  role?: UserRole;
  password?: string;
}

interface PracticeUserSummary {
  id: string;
}

@Controller('practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LAWYER)
export class PracticeController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getPracticeUsers(@Req() req: AuthenticatedRequest) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );
    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to view practice users',
      );
    }
    return this.adminService.getPracticeUsers(currentUser.primaryPracticeId);
  }

  @Get('users/:id')
  async getPracticeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );
    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to view practice users',
      );
    }
    const users = (await this.adminService.getPracticeUsers(
      currentUser.primaryPracticeId,
    )) as PracticeUserSummary[];
    return users.find((user) => user.id === id);
  }

  @Put('users/:id')
  async updatePracticeUser(
    @Param('id') id: string,
    @Body() updateData: PracticeUserUpdateData,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateUser(
      id,
      updateData,
      req.user.sub,
      req.user.role,
    );
  }

  @Post('users/:id/reset-password')
  async resetPracticeUserPassword(
    @Param('id') id: string,
    @Body() data: { password: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.resetUserPassword(
      id,
      data.password,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch('users/:id/deactivate')
  async deactivatePracticeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.deactivateUser(id, req.user.sub, req.user.role);
  }

  @Patch('users/:id/reactivate')
  async reactivatePracticeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.reactivateUser(id, req.user.sub, req.user.role);
  }

  @Post('users')
  async createPracticeUser(
    @Body()
    createData: {
      name: string;
      email: string;
      password: string;
      role: string;
      phone?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.createUser(
      createData,
      req.user.sub,
      req.user.role,
    );
  }
}
