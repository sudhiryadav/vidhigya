import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CalendarModule } from './calendar/calendar.module';
import { CasesModule } from './cases/cases.module';
import { ChatModule } from './chat/chat.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { AIModule } from './config/ai.module';
import { QdrantModule } from './config/qdrant.module';
import { S3Module } from './config/s3.module';
import { CourtsModule } from './courts/courts.module';
import { DocumentsModule } from './documents/documents.module';
import { FeedbackModule } from './feedback/feedback.module';
import { LogsModule } from './logs/logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { TasksModule } from './tasks/tasks.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { VideoCallsModule } from './video-calls/video-calls.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    S3Module,
    QdrantModule,
    AIModule,
    AuthModule,
    CasesModule,
    DocumentsModule,
    LogsModule,
    ChatModule,
    BillingModule,
    CalendarModule,
    TasksModule,
    NotificationsModule,
    ClientPortalModule,
    UserSettingsModule,
    VideoCallsModule,
    AdminModule,
    CourtsModule,
    FeedbackModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
