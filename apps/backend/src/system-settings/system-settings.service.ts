import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  category: string;
  isActive: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

export interface SystemSettings {
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    autoBackup: boolean;
    dataRetention: string;
  };
  security: {
    sessionTimeout: string;
    passwordPolicy: string;
    ipWhitelist: string;
    auditLogging: boolean;
  };
  notifications: {
    systemAlerts: boolean;
    userActivity: boolean;
    securityEvents: boolean;
    backupNotifications: boolean;
  };
  integrations: {
    emailProvider: string;
    smsProvider: string;
    storageProvider: string;
    analyticsEnabled: boolean;
  };
}

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all system settings
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const settings = await this.prisma.systemSettings.findMany({
        where: { isActive: true },
        orderBy: { category: 'asc' },
      });
      return settings;
    } catch (error) {
      this.logger.error('Error fetching system settings:', error);
      throw error;
    }
  }

  /**
   * Get system settings by category
   */
  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    try {
      const settings = await this.prisma.systemSettings.findMany({
        where: {
          category,
          isActive: true,
        },
        orderBy: { key: 'asc' },
      });
      return settings;
    } catch (error) {
      this.logger.error(`Error fetching ${category} settings:`, error);
      throw error;
    }
  }

  /**
   * Get a specific system setting by key
   */
  async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key },
      });
      return setting;
    } catch (error) {
      this.logger.error(`Error fetching setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get system settings in structured format
   */
  async getStructuredSettings(): Promise<SystemSettings> {
    try {
      const settings = await this.getAllSettings();

      // Convert to structured format
      const structured: SystemSettings = {
        system: {
          maintenanceMode: this.getBooleanValue(settings, 'maintenanceMode'),
          debugMode: this.getBooleanValue(settings, 'debugMode'),
          autoBackup: this.getBooleanValue(settings, 'autoBackup'),
          dataRetention: this.getStringValue(settings, 'dataRetention'),
        },
        security: {
          sessionTimeout: this.getStringValue(settings, 'sessionTimeout'),
          passwordPolicy: this.getStringValue(settings, 'passwordPolicy'),
          ipWhitelist: this.getStringValue(settings, 'ipWhitelist'),
          auditLogging: this.getBooleanValue(settings, 'auditLogging'),
        },
        notifications: {
          systemAlerts: this.getBooleanValue(settings, 'systemAlerts'),
          userActivity: this.getBooleanValue(settings, 'userActivity'),
          securityEvents: this.getBooleanValue(settings, 'securityEvents'),
          backupNotifications: this.getBooleanValue(
            settings,
            'backupNotifications',
          ),
        },
        integrations: {
          emailProvider: this.getStringValue(settings, 'emailProvider'),
          smsProvider: this.getStringValue(settings, 'smsProvider'),
          storageProvider: this.getStringValue(settings, 'storageProvider'),
          analyticsEnabled: this.getBooleanValue(settings, 'analyticsEnabled'),
        },
      };

      return structured;
    } catch (error) {
      this.logger.error('Error fetching structured settings:', error);
      throw error;
    }
  }

  /**
   * Update a system setting
   */
  async updateSetting(
    key: string,
    value: string,
    userId?: string,
  ): Promise<SystemSetting> {
    try {
      const setting = await this.prisma.systemSettings.update({
        where: { key },
        data: {
          value,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });

      this.logger.log(
        `System setting ${key} updated to ${value} by user ${userId}`,
      );
      return setting;
    } catch (error) {
      this.logger.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple system settings
   */
  async updateMultipleSettings(
    updates: Array<{ key: string; value: string }>,
    userId?: string,
  ): Promise<SystemSetting[]> {
    try {
      const updatedSettings: SystemSetting[] = [];

      for (const update of updates) {
        const setting = await this.updateSetting(
          update.key,
          update.value,
          userId,
        );
        updatedSettings.push(setting);
      }

      this.logger.log(
        `Updated ${updates.length} system settings by user ${userId}`,
      );
      return updatedSettings;
    } catch (error) {
      this.logger.error('Error updating multiple settings:', error);
      throw error;
    }
  }

  /**
   * Check if system is in maintenance mode
   */
  async isMaintenanceMode(): Promise<boolean> {
    try {
      const setting = await this.getSetting('maintenanceMode');
      return setting ? setting.value === 'true' : false;
    } catch (error) {
      this.logger.error('Error checking maintenance mode:', error);
      return false;
    }
  }

  /**
   * Get session timeout in minutes
   */
  async getSessionTimeout(): Promise<number> {
    try {
      const setting = await this.getSetting('sessionTimeout');
      return setting ? parseInt(setting.value, 10) : 30;
    } catch (error) {
      this.logger.error('Error getting session timeout:', error);
      return 30;
    }
  }

  /**
   * Get password policy
   */
  async getPasswordPolicy(): Promise<string> {
    try {
      const setting = await this.getSetting('passwordPolicy');
      return setting ? setting.value : 'strong';
    } catch (error) {
      this.logger.error('Error getting password policy:', error);
      return 'strong';
    }
  }

  /**
   * Check if IP is whitelisted
   */
  async isIpWhitelisted(ip: string): Promise<boolean> {
    try {
      const setting = await this.getSetting('ipWhitelist');
      if (!setting || !setting.value) return true; // No whitelist means all IPs allowed

      const whitelistedIps = setting.value
        .split('\n')
        .map((ip) => ip.trim())
        .filter((ip) => ip);
      return whitelistedIps.includes(ip) || whitelistedIps.length === 0;
    } catch (error) {
      this.logger.error('Error checking IP whitelist:', error);
      return true; // Default to allowing access
    }
  }

  /**
   * Helper method to get boolean value from settings
   */
  private getBooleanValue(settings: SystemSetting[], key: string): boolean {
    const setting = settings.find((s) => s.key === key);
    return setting ? setting.value === 'true' : false;
  }

  /**
   * Helper method to get string value from settings
   */
  private getStringValue(settings: SystemSetting[], key: string): string {
    const setting = settings.find((s) => s.key === key);
    return setting ? setting.value : '';
  }
}
