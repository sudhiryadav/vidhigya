import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tf from '@tensorflow/tfjs-node';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private model: tf.LayersModel | null = null;
  private readonly embeddingDimension = 384; // Match the dimension used in FastAPI

  constructor(private readonly configService: ConfigService) {}

  async initialize() {
    try {
      // For now, we'll use a simple approach without loading a pre-trained model
      // This is a fallback when FastAPI service is not available
      this.logger.log('Embedding service initialized with fallback method');
    } catch (error) {
      this.logger.error('Failed to initialize embedding service:', error);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Simple fallback embedding generation
      // This creates a deterministic embedding based on text content
      return this.generateSimpleEmbedding(text);
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(this.embeddingDimension).fill(0);
    }
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding generation
    // This is not as sophisticated as a proper embedding model but works for basic similarity
    const normalizedText = text.toLowerCase().trim();
    const embedding = new Array(this.embeddingDimension).fill(0);

    // Simple character-based hash
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const position = (charCode * (i + 1)) % this.embeddingDimension;
      embedding[position] += 1;
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }

    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }

    return dotProduct; // Cosine similarity (vectors are already normalized)
  }
}
