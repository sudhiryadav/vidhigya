import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

interface PracticeUserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

interface PracticeUserSummary {
  id: string;
}

interface PracticeUserUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  role?: UserRole;
  password?: string;
}

interface UpdatePracticeSubscriptionData {
  plan?: string;
  seatLimit?: number;
}

@Controller('practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LAWYER)
export class PracticeController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getPracticeUsers(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: PracticeUserFilters = { search, role };

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    // Get current user's practice ID
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to view practice users',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can view practice users',
      );
    }

    return this.adminService.getPracticeUsers(
      currentUser.primaryPracticeId,
      filters,
    );
  }

  @Get('users/:id')
  async getPracticeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Get current user's practice ID
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to view practice users',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can view practice users',
      );
    }

    const users = await this.adminService.getPracticeUsers(
      currentUser.primaryPracticeId,
      {},
    );
    return (users as PracticeUserSummary[]).find((user) => user.id === id);
  }

  @Put('users/:id')
  async updatePracticeUser(
    @Param('id') id: string,
    @Body() updateData: PracticeUserUpdateData,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to update practice users',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can update practice users',
      );
    }

    return this.adminService.updateUser(
      id,
      updateData,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  @Post('users/:id/reset-password')
  async resetPracticeUserPassword(
    @Param('id') id: string,
    @Body() data: { password: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to reset practice user passwords',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can reset practice user passwords',
      );
    }

    return this.adminService.resetUserPassword(
      id,
      data.password,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  @Patch('users/:id/deactivate')
  async deactivatePracticeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to deactivate practice users',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can deactivate practice users',
      );
    }

    return this.adminService.deactivateUser(
      id,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  @Patch('users/:id/reactivate')
  async reactivatePracticeUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to reactivate practice users',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can reactivate practice users',
      );
    }

    return this.adminService.reactivateUser(
      id,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
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
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to create practice users',
      );
    }

    // Check if user is the practice owner
    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can create practice users',
      );
    }

    return this.adminService.createUser(
      createData,
      req.user.sub,
      req.user.role,
      currentUser.primaryPracticeId,
    );
  }

  @Get('subscription-settings')
  async getPracticeSubscriptionSettings(@Req() req: AuthenticatedRequest) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to view subscription settings',
      );
    }

    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can view subscription settings',
      );
    }

    return this.adminService.getPracticeSubscriptionSettings(
      currentUser.primaryPracticeId,
    );
  }

  @Put('subscription-settings')
  async updatePracticeSubscriptionSettings(
    @Body() updateData: UpdatePracticeSubscriptionData,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUser = await this.adminService.getCurrentUserPractice(
      req.user.sub,
    );

    if (!currentUser.primaryPracticeId) {
      throw new ForbiddenException(
        'You must be associated with a practice to update subscription settings',
      );
    }

    const isOwner = await this.adminService.isPracticeOwner(
      req.user.sub,
      currentUser.primaryPracticeId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the firm owner can update subscription settings',
      );
    }

    return this.adminService.updatePracticeSubscriptionSettings(
      currentUser.primaryPracticeId,
      updateData,
      req.user.sub,
    );
  }
}
