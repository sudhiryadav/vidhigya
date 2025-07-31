import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('recent-activity')
  getRecentActivity(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getRecentActivity(limitNum);
  }

  @Get('lawyers')
  async getLawyers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters = {
      search,
      role,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    };
    return this.adminService.getLawyers(filters);
  }

  @Post('lawyers')
  async createLawyer(
    @Body()
    data: {
      name: string;
      email: string;
      password: string;
      role: 'LAWYER' | 'ASSOCIATE' | 'PARALEGAL';
      phone?: string;
      specialization?: string;
    },
  ) {
    return this.adminService.createLawyer(data);
  }

  @Put('lawyers/:id')
  async updateLawyer(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      email?: string;
      role?: 'LAWYER' | 'ASSOCIATE' | 'PARALEGAL';
      phone?: string;
      isActive?: boolean;
    },
  ) {
    return this.adminService.updateLawyer(id, data);
  }

  @Delete('lawyers/:id')
  async deleteLawyer(@Param('id') id: string) {
    await this.adminService.deleteLawyer(id);
    return { message: 'Lawyer deleted successfully' };
  }
}
