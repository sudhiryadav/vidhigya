import { Module } from '@nestjs/common';
import { PermissionModule } from '../common/permissions/permission.module';
import { DocumentProcessingMonitorModule } from '../documents/document-processing-monitor.module';
import { EmailModule } from '../email/email.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PermissionModule, DocumentProcessingMonitorModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
