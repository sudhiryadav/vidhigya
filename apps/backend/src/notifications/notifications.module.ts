import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseReminderEmailService } from './case-reminder-email.service';
import { NotificationEmitterService } from './notification-emitter.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationEmitterService,
    CaseReminderEmailService,
  ],
  exports: [NotificationsService, NotificationEmitterService],
})
export class NotificationsModule {}
