import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationEmitterService } from './notification-emitter.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEmitterService],
  exports: [NotificationsService, NotificationEmitterService],
})
export class NotificationsModule {}
