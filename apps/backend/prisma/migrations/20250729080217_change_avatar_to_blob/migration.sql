/*
  Warnings:

  - The `avatar` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "analyticsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "auditLogging" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoBackup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "backupNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "billingAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "calendarReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "caseUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dataRetention" TEXT NOT NULL DEFAULT '90',
ADD COLUMN     "dataSharing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
ADD COLUMN     "debugMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailProvider" TEXT NOT NULL DEFAULT 'smtp',
ADD COLUMN     "ipWhitelist" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordPolicy" TEXT NOT NULL DEFAULT 'strong',
ADD COLUMN     "profileVisibility" TEXT NOT NULL DEFAULT 'public',
ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "securityEvents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sessionTimeout" TEXT NOT NULL DEFAULT '30',
ADD COLUMN     "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsProvider" TEXT NOT NULL DEFAULT 'twilio',
ADD COLUMN     "storageProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "systemAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "twoFactorAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userActivity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar",
ADD COLUMN     "avatar" BYTEA;
