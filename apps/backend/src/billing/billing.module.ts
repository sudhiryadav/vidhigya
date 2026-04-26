import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionModule } from '../common/permissions/permission.module';

@Module({
  imports: [PrismaModule, PermissionModule, ConfigModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
