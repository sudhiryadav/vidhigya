import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UpdateUserSettingsDto,
  UserSettingsService,
} from './user-settings.service';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('user-settings')
@UseGuards(JwtAuthGuard)
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get('test')
  test() {
    return { message: 'UserSettings module is working!' };
  }

  @Get()
  async getSettings(@Request() req: AuthenticatedRequest): Promise<any> {
    return this.userSettingsService.findByUserId(req.user.sub);
  }

  @Patch()
  async updateSettings(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ): Promise<any> {
    return this.userSettingsService.update(req.user.sub, updateUserSettingsDto);
  }

  @Get('default-currency')
  async getDefaultCurrency(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ currency: string }> {
    const currency = (await this.userSettingsService.getDefaultCurrency(
      req.user.sub,
    )) as string;
    return { currency };
  }
}
