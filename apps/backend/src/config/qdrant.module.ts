import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';

@Module({
  imports: [ConfigModule],
  providers: [EmbeddingService, QdrantService],
  exports: [QdrantService],
})
export class QdrantModule implements OnModuleInit {
  constructor(private readonly qdrantService: QdrantService) {}

  async onModuleInit() {
    // Initialize Qdrant service and ensure collection exists
    await this.qdrantService.initialize();
  }
}
