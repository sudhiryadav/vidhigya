import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  SystemSettings,
  SystemSettingsService,
} from './system-settings.service';

@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  /**
   * Get all system settings (Super Admin only)
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async getAllSettings() {
    return this.systemSettingsService.getAllSettings();
  }

  /**
   * Get system settings by category (Super Admin only)
   */
  @Get('category/:category')
  @Roles(UserRole.SUPER_ADMIN)
  async getSettingsByCategory(@Body('category') category: string) {
    return this.systemSettingsService.getSettingsByCategory(category);
  }

  /**
   * Get structured system settings (Super Admin only)
   */
  @Get('structured')
  @Roles(UserRole.SUPER_ADMIN)
  async getStructuredSettings(): Promise<SystemSettings> {
    return this.systemSettingsService.getStructuredSettings();
  }

  /**
   * Get a specific system setting (Super Admin only)
   */
  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN)
  async getSetting(@Body('key') key: string) {
    return this.systemSettingsService.getSetting(key);
  }

  /**
   * Update a system setting (Super Admin only)
   */
  @Put(':key')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  async updateSetting(
    @Body('key') key: string,
    @Body('value') value: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.systemSettingsService.updateSetting(key, value, userId);
  }

  /**
   * Update multiple system settings (Super Admin only)
   */
  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  async updateMultipleSettings(
    @Body() updates: Array<{ key: string; value: string }>,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.systemSettingsService.updateMultipleSettings(updates, userId);
  }

  /**
   * Check if system is in maintenance mode (Public endpoint)
   */
  @Get('maintenance/status')
  async getMaintenanceStatus() {
    const isMaintenanceMode =
      await this.systemSettingsService.isMaintenanceMode();
    return { maintenanceMode: isMaintenanceMode };
  }

  /**
   * Get session timeout (Public endpoint)
   */
  @Get('security/session-timeout')
  async getSessionTimeout() {
    const timeout = await this.systemSettingsService.getSessionTimeout();
    return { sessionTimeout: timeout };
  }

  /**
   * Get password policy (Public endpoint)
   */
  @Get('security/password-policy')
  async getPasswordPolicy() {
    const policy = await this.systemSettingsService.getPasswordPolicy();
    return { passwordPolicy: policy };
  }

  /**
   * Check if IP is whitelisted (Public endpoint)
   */
  @Post('security/ip-check')
  async checkIpWhitelist(@Body('ip') ip: string) {
    const isWhitelisted = await this.systemSettingsService.isIpWhitelisted(ip);
    return { isWhitelisted };
  }
}
