import { Module } from '@nestjs/common';
import { DocumentProcessingMonitorModule } from '../documents/document-processing-monitor.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, DocumentProcessingMonitorModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
