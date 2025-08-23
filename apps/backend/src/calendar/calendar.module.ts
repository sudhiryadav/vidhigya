import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleCalendarService } from './google-calendar.service';
import { PermissionModule } from '../common/permissions/permission.module';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [CalendarController],
  providers: [CalendarService, GoogleCalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
