import { Module } from '@nestjs/common';
import { PermissionModule } from '../common/permissions/permission.module';
import { DocumentProcessingMonitorModule } from '../documents/document-processing-monitor.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ModuleManagementController } from './module-management.controller';
import { ModuleManagementService } from './module-management.service';

@Module({
  imports: [PermissionModule, DocumentProcessingMonitorModule],
  controllers: [AdminController, ModuleManagementController],
  providers: [AdminService, ModuleManagementService],
  exports: [AdminService, ModuleManagementService],
})
export class AdminModule {}
