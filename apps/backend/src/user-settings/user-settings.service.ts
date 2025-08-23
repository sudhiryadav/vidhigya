import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserSettingsDto {
  userId: string;
  currency?: Currency;
  practiceId: string;
}

export interface UpdateUserSettingsDto {
  currency?: Currency;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  caseUpdates?: boolean;
  billingAlerts?: boolean;
  calendarReminders?: boolean;
  profileVisibility?: string;
  dataSharing?: boolean;
  twoFactorAuth?: boolean;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  theme?: string;
  fontSize?: string;
  // Admin settings
  maintenanceMode?: boolean;
  debugMode?: boolean;
  autoBackup?: boolean;
  dataRetention?: string;
  sessionTimeout?: string;
  passwordPolicy?: string;
  ipWhitelist?: string;
  auditLogging?: boolean;
  systemAlerts?: boolean;
  userActivity?: boolean;
  securityEvents?: boolean;
  backupNotifications?: boolean;
  emailProvider?: string;
  smsProvider?: string;
  storageProvider?: string;
  analyticsEnabled?: boolean;
}

@Injectable()
export class UserSettingsService {
  constructor(private prisma: PrismaService) {}

  async create(createUserSettingsDto: CreateUserSettingsDto) {
    return this.prisma.userSettings.create({
      data: createUserSettingsDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!settings) {
      // Return default settings if none exist
      return {
        id: null,
        userId,
        currency: 'INR' as Currency,
        fontSize: 'sm',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        }),
      };
    }

    return settings;
  }

  async update(userId: string, updateUserSettingsDto: UpdateUserSettingsDto) {
    const existingSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!existingSettings) {
      // Create settings if they don't exist - use default practice
      return this.create({
        userId,
        practiceId: 'default-practice',
        ...updateUserSettingsDto,
      });
    }

    return this.prisma.userSettings.update({
      where: { userId },
      data: updateUserSettingsDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getDefaultCurrency(userId: string): Promise<Currency> {
    const settings = await this.findByUserId(userId);
    return settings.currency;
  }
}
