import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { CommonModule } from '../common/common.module';
import { QdrantModule } from '../config/qdrant.module';
import { S3Module } from '../config/s3.module';
import { LogsModule } from '../logs/logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionModule } from '../common/permissions/permission.module';
import { DocumentProcessingMonitorModule } from './document-processing-monitor.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    PrismaModule,
    S3Module,
    QdrantModule,
    LogsModule,
    CommonModule,
    PermissionModule,
    MulterModule.register({
      dest: './uploads/documents',
    }),
    DocumentProcessingMonitorModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
