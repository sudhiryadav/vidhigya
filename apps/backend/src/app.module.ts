import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CalendarModule } from './calendar/calendar.module';
import { CasesModule } from './cases/cases.module';
import { ChatModule } from './chat/chat.module';
// import { ClientPortalModule } from './client-portal/client-portal.module';
import { ClientsModule } from './clients/clients.module';
import { PracticesModule } from './practices/practices.module';
import { TasksModule } from './tasks/tasks.module';

import { PermissionModule } from './common/permissions/permission.module';
import { QdrantModule } from './config/qdrant.module';
import { S3Module } from './config/s3.module';
import { CourtsModule } from './courts/courts.module';
import { DocumentsModule } from './documents/documents.module';
import { EcourtsModule } from './ecourts/ecourts.module';
import { FeedbackModule } from './feedback/feedback.module';
import { LogsModule } from './logs/logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { UserSettingsModule } from './user-settings/user-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    S3Module,
    QdrantModule,
    PermissionModule,

    AuthModule,
    PracticesModule,
    ClientsModule,
    UserSettingsModule,
    SystemSettingsModule,
    BillingModule,
    CalendarModule,
    CasesModule,
    DocumentsModule,
    FeedbackModule,
    ChatModule,
    LogsModule,
    AdminModule,
    CourtsModule,
    ReportsModule,
    PracticesModule,
    // Temporarily disabled due to practice system migration
    // ClientPortalModule,
    TasksModule,
    NotificationsModule,
    EcourtsModule,
    // VideoCallsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
