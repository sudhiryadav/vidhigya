import { Module } from '@nestjs/common';
import { S3Module } from '../config/s3.module';
import { LogsModule } from '../logs/logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentProcessingMonitorService } from './document-processing-monitor.service';

@Module({
  imports: [PrismaModule, LogsModule, S3Module],
  providers: [DocumentProcessingMonitorService],
  exports: [DocumentProcessingMonitorService],
})
export class DocumentProcessingMonitorModule {}
