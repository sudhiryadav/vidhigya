import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting system settings seeding...');

  // Default system settings
  const defaultSettings = [
    // System settings
    {
      key: 'maintenanceMode',
      value: 'false',
      description: 'Put the system in maintenance mode',
      category: 'system',
    },
    {
      key: 'debugMode',
      value: 'false',
      description: 'Enable debug logging',
      category: 'system',
    },
    {
      key: 'autoBackup',
      value: 'true',
      description: 'Automatically backup data',
      category: 'system',
    },
    {
      key: 'dataRetention',
      value: '90',
      description: 'Data retention period in days',
      category: 'system',
    },

    // Security settings
    {
      key: 'sessionTimeout',
      value: '30',
      description: 'Session timeout in minutes',
      category: 'security',
    },
    {
      key: 'passwordPolicy',
      value: 'strong',
      description: 'Password policy strength',
      category: 'security',
    },
    {
      key: 'ipWhitelist',
      value: '',
      description: 'IP addresses allowed to access the system',
      category: 'security',
    },
    {
      key: 'auditLogging',
      value: 'true',
      description: 'Log all system activities',
      category: 'security',
    },

    // Notification settings
    {
      key: 'systemAlerts',
      value: 'true',
      description: 'Critical system notifications',
      category: 'notifications',
    },
    {
      key: 'userActivity',
      value: 'false',
      description: 'Monitor user actions',
      category: 'notifications',
    },
    {
      key: 'securityEvents',
      value: 'true',
      description: 'Security-related notifications',
      category: 'notifications',
    },
    {
      key: 'backupNotifications',
      value: 'true',
      description: 'Backup status updates',
      category: 'notifications',
    },

    // Integration settings
    {
      key: 'emailProvider',
      value: 'smtp',
      description: 'Email service provider',
      category: 'integrations',
    },
    {
      key: 'smsProvider',
      value: 'twilio',
      description: 'SMS service provider',
      category: 'integrations',
    },
    {
      key: 'storageProvider',
      value: 'local',
      description: 'File storage provider',
      category: 'integrations',
    },
    {
      key: 'analyticsEnabled',
      value: 'true',
      description: 'Enable usage analytics',
      category: 'integrations',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
        category: setting.category,
        updatedAt: new Date(),
      },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
      },
    });
  }

  console.log('✅ System settings seeded successfully!');
  console.log('\n📋 Default System Settings:');
  console.log('Maintenance Mode: false');
  console.log('Debug Mode: false');
  console.log('Session Timeout: 30 minutes');
  console.log('Password Policy: strong');
  console.log('Audit Logging: enabled');
  console.log('Auto Backup: enabled');
}

main()
  .catch((e) => {
    console.error('❌ Error during system settings seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
