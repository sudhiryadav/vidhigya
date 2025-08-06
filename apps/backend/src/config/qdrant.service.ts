import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class QdrantService {
  private qdrantClient: QdrantClient;
  private qdrantUrl: string;
  private qdrantApiKey: string;
  private qdrantCollection: string;

  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
  ) {
    this.qdrantUrl = this.configService.get<string>('QDRANT_URL');
    this.qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY');
    this.qdrantCollection = this.configService.get<string>('QDRANT_COLLECTION');

    // Initialize Qdrant client
    this.initializeQdrantClient();

    // Initialize embedding service
    this.embeddingService.initialize();

    // Log configuration on startup
    console.log('QdrantService initialized with:');
    console.log(`- Qdrant URL: ${this.qdrantUrl}`);
    console.log(`- Qdrant API Key configured: ${!!this.qdrantApiKey}`);
    console.log(`- Qdrant Collection: ${this.qdrantCollection}`);
  }

  async initialize() {
    // Ensure collection exists
    await this.ensureCollectionExists();
  }

  private initializeQdrantClient() {
    if (!this.qdrantUrl) {
      console.error('QDRANT_URL not configured');
      return;
    }

    try {
      this.qdrantClient = new QdrantClient({
        url: this.qdrantUrl,
        apiKey: this.qdrantApiKey,
      });
      console.log('Qdrant client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Qdrant client:', error);
    }
  }

  private async ensureCollectionExists(): Promise<void> {
    if (!this.qdrantClient || !this.qdrantCollection) {
      console.error('Qdrant client or collection not configured');
      return;
    }

    try {
      // Check if collection exists
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.qdrantCollection,
      );

      if (!collectionExists) {
        console.log(`Creating Qdrant collection: ${this.qdrantCollection}`);

        // Create collection with proper configuration for embeddings
        await this.qdrantClient.createCollection(this.qdrantCollection, {
          vectors: {
            size: 384, // Match the embedding dimension
            distance: 'Cosine', // Use cosine distance for similarity
          },
        });

        // Create indexes for filtering and deletion operations
        await this.qdrantClient.createPayloadIndex(this.qdrantCollection, {
          field_name: 'document_id',
          field_schema: 'keyword',
        });

        await this.qdrantClient.createPayloadIndex(this.qdrantCollection, {
          field_name: 'user_id',
          field_schema: 'keyword',
        });

        console.log(
          `Successfully created Qdrant collection: ${this.qdrantCollection}`,
        );
      } else {
        console.log(
          `Qdrant collection already exists: ${this.qdrantCollection}`,
        );

        // Ensure indexes exist for existing collections
        await this.ensureIndexesExist();
      }
    } catch (error) {
      console.error(`Error ensuring collection exists: ${error}`);
      // Don't throw error, just log it
    }
  }

  private async ensureIndexesExist(): Promise<void> {
    if (!this.qdrantClient || !this.qdrantCollection) {
      return;
    }

    try {
      // Try to create document_id index (will fail silently if it already exists)
      try {
        await this.qdrantClient.createPayloadIndex(this.qdrantCollection, {
          field_name: 'document_id',
          field_schema: 'keyword',
        });
        console.log('Created document_id index for existing collection');
      } catch {
        // Index might already exist, which is fine
        console.log('document_id index already exists or creation failed');
      }

      // Try to create user_id index (will fail silently if it already exists)
      try {
        await this.qdrantClient.createPayloadIndex(this.qdrantCollection, {
          field_name: 'user_id',
          field_schema: 'keyword',
        });
        console.log('Created user_id index for existing collection');
      } catch {
        // Index might already exist, which is fine
        console.log('user_id index already exists or creation failed');
      }
    } catch (error) {
      console.error('Error ensuring indexes exist:', error);
      // Don't throw error, just log it
    }
  }

  async deleteDocumentEmbeddings(documentId: string): Promise<boolean> {
    try {
      console.log(
        `Attempting to delete embeddings for document: ${documentId}`,
      );
      console.log(`Qdrant URL: ${this.qdrantUrl}`);
      console.log(`Qdrant Collection: ${this.qdrantCollection}`);

      if (!this.qdrantClient) {
        console.error('Qdrant client not initialized');
        return false;
      }

      if (!this.qdrantCollection) {
        console.error('Qdrant collection not configured');
        return false;
      }

      console.log(
        `Deleting embeddings from Qdrant collection: ${this.qdrantCollection}`,
      );

      // Delete embeddings from Qdrant using document_id filter
      const deleteResult = await this.qdrantClient.delete(
        this.qdrantCollection,
        {
          filter: {
            must: [
              {
                key: 'document_id',
                match: {
                  value: documentId,
                },
              },
            ],
          },
        },
      );

      console.log(
        `Successfully deleted embeddings for document ${documentId}: ${JSON.stringify(deleteResult)}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Error deleting embeddings for document ${documentId}:`,
        error,
      );
      return false;
    }
  }

  async searchDocuments(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<
    Array<{
      document_id: string;
      content: string;
      score: number;
      page_number?: number;
      start_char?: number;
      end_char?: number;
    }>
  > {
    try {
      if (!this.qdrantClient) {
        console.error('Qdrant client not available');
        return [];
      }

      // Generate embedding for the query using the same model as FastAPI
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in Qdrant directly
      const searchResults = await this.qdrantClient.search(
        this.qdrantCollection,
        {
          vector: queryEmbedding,
          limit: limit,
          filter: {
            must: [
              {
                key: 'user_id',
                match: { value: userId },
              },
            ],
          },
          with_payload: true,
          with_vector: false,
        },
      );

      return searchResults.map((result) => ({
        document_id: (result.payload?.document_id as string) || '',
        content: (result.payload?.content as string) || '',
        score: result.score,
        page_number: result.payload?.page_number as number | undefined,
        start_char: result.payload?.start_char as number | undefined,
        end_char: result.payload?.end_char as number | undefined,
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use local embedding service directly
      return await this.embeddingService.generateEmbedding(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback: return a zero vector
      return new Array(384).fill(0) as number[];
    }
  }

  async queryDocuments(
    question: string,
    userId: string,
    // context?: string, // Removed unused parameter
  ): Promise<{
    question: string;
    answer: string;
    sources: Array<{
      document_id: string;
      content: string;
      score: number;
      page_number?: number;
      start_char?: number;
      end_char?: number;
    }>;
    confidence: number;
  }> {
    try {
      // Search for relevant documents using local embedding
      const searchResults = await this.searchDocuments(question, userId, 5);

      if (!searchResults || searchResults.length === 0) {
        return {
          question,
          answer:
            "I couldn't find any relevant documents to answer your question. Please make sure you have uploaded documents and try asking a different question.",
          sources: [],
          confidence: 0.0,
        };
      }

      // Generate a simple answer based on search results
      const answer = this.generateSimpleAnswer(question, searchResults);
      const confidence = Math.min(0.8, searchResults[0]?.score || 0.0);

      return {
        question,
        answer,
        sources: searchResults.map((result) => ({
          document_id: result.document_id,
          content: result.content,
          score: result.score,
          page_number: result.page_number,
          start_char: result.start_char,
          end_char: result.end_char,
        })),
        confidence,
      };
    } catch (error) {
      console.error('Error querying documents:', error);
      return {
        question,
        answer: 'An error occurred while processing your question',
        sources: [],
        confidence: 0.0,
      };
    }
  }

  private generateSimpleAnswer(
    question: string,
    searchResults: Array<{
      document_id: string;
      content: string;
      score: number;
      page_number?: number;
      start_char?: number;
      end_char?: number;
    }>,
  ): string {
    // Generate a contextual answer based on search results
    let answer = `Based on your documents, here's what I found about "${question}":\n\n`;

    // Add the most relevant content
    const topResult = searchResults[0];
    if (topResult && topResult.score > 0.5) {
      answer += `**Most relevant information:**\n${topResult.content.substring(0, 300)}`;
      if (topResult.content.length > 300) {
        answer += '...';
      }
      answer += '\n\n';
    }

    // Add additional context if available
    if (searchResults.length > 1) {
      answer += `**Additional relevant information:**\n`;
      for (let i = 1; i < Math.min(3, searchResults.length); i++) {
        const result = searchResults[i];
        if (result.score > 0.3) {
          answer += `• ${result.content.substring(0, 150)}...\n`;
        }
      }
    }

    answer += `\n*This response is based on ${searchResults.length} relevant document sections found in your uploaded files.*`;

    return answer;
  }

  async storeDocumentChunks(
    documentId: string,
    userId: string,
    chunks: Array<{
      text: string;
      page_number?: number;
      start_char?: number;
      end_char?: number;
    }>,
    filename: string,
    fileType: string,
  ): Promise<boolean> {
    try {
      if (!this.qdrantClient) {
        console.error('Qdrant client not available');
        return false;
      }

      // Ensure collection exists before storing data
      await this.ensureCollectionExists();

      const points: Array<{
        id: string;
        vector: number[];
        payload: {
          document_id: string;
          user_id: string;
          content: string;
          filename: string;
          chunk_index: number;
          page_number?: number;
          start_char?: number;
          end_char?: number;
          file_type: string;
        };
      }> = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding for the chunk
        const embedding = await this.generateEmbedding(chunk.text);

        points.push({
          id: uuidv4(),
          vector: embedding,
          payload: {
            document_id: documentId,
            user_id: userId,
            content: chunk.text,
            filename: filename,
            chunk_index: i,
            page_number: chunk.page_number,
            start_char: chunk.start_char,
            end_char: chunk.end_char,
            file_type: fileType,
          },
        });
      }

      // Upsert points to Qdrant
      await this.qdrantClient.upsert(this.qdrantCollection, {
        points: points,
      });

      console.log(`Stored ${points.length} chunks for document ${documentId}`);
      return true;
    } catch (error) {
      console.error('Error storing document chunks:', error);
      return false;
    }
  }

  deleteUserEmbeddings(userId: string): Promise<boolean> {
    try {
      // This functionality is not implemented yet
      console.warn('Delete user embeddings not implemented yet');
      return Promise.resolve(false);
    } catch (error) {
      console.error(`Error deleting embeddings for user ${userId}:`, error);
      return Promise.resolve(false);
    }
  }
}
