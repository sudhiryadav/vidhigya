import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { QdrantModule } from '../config/qdrant.module';
import { S3Module } from '../config/s3.module';
import { LogsModule } from '../logs/logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    PrismaModule,
    S3Module,
    QdrantModule,
    LogsModule,
    MulterModule.register({
      dest: './uploads/documents',
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
