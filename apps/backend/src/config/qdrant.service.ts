import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService {
  private aiServiceUrl: string;
  private aiServiceApiKey: string;
  private qdrantClient: QdrantClient;
  private qdrantUrl: string;
  private qdrantApiKey: string;
  private qdrantCollection: string;

  constructor(private configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
    this.aiServiceApiKey = this.configService.get<string>('AI_SERVICE_API_KEY');
    this.qdrantUrl = this.configService.get<string>('QDRANT_URL');
    this.qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY');
    this.qdrantCollection = this.configService.get<string>('QDRANT_COLLECTION');

    // Initialize Qdrant client
    this.initializeQdrantClient();

    // Log configuration on startup
    console.log('QdrantService initialized with:');
    console.log(`- AI Service URL: ${this.aiServiceUrl}`);
    console.log(`- AI Service API Key configured: ${!!this.aiServiceApiKey}`);
    console.log(`- Qdrant URL: ${this.qdrantUrl}`);
    console.log(`- Qdrant API Key configured: ${!!this.qdrantApiKey}`);
    console.log(`- Qdrant Collection: ${this.qdrantCollection}`);
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
      if (!this.aiServiceUrl || !this.aiServiceApiKey) {
        console.error('AI service URL or API key not configured');
        return [];
      }

      const formData = new FormData();
      formData.append('query', query);
      formData.append('userId', userId);
      formData.append('limit', limit.toString());
      formData.append('mode', 'search');

      const response = await fetch(
        `${this.aiServiceUrl}/api/v1/admin/documents/query`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': this.aiServiceApiKey,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        console.error(`Failed to search documents: ${response.statusText}`);
        return [];
      }

      const result = (await response.json()) as {
        query: string;
        results: Array<{
          score: number;
          content: string;
          filename: string;
          page_number?: number;
          chunk_index?: number;
          document_id: string;
          file_type?: string;
          start_char?: number;
          end_char?: number;
        }>;
        total_results: number;
      };

      return result.results.map((item) => ({
        document_id: item.document_id,
        content: item.content,
        score: item.score,
        page_number: item.page_number,
        start_char: item.start_char,
        end_char: item.end_char,
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async queryDocuments(
    question: string,
    userId: string,
    context?: string,
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
      if (!this.aiServiceUrl || !this.aiServiceApiKey) {
        console.error('AI service URL or API key not configured');
        return {
          question,
          answer: 'AI service not available',
          sources: [],
          confidence: 0.0,
        };
      }

      const formData = new FormData();
      formData.append('query', question);
      formData.append('userId', userId);
      formData.append('mode', 'qa');
      if (context) {
        formData.append('context', context);
      }

      const response = await fetch(
        `${this.aiServiceUrl}/api/v1/admin/documents/query`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': this.aiServiceApiKey,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        console.error(`Failed to query documents: ${response.statusText}`);
        return {
          question,
          answer: 'Failed to process your question',
          sources: [],
          confidence: 0.0,
        };
      }

      const result = (await response.json()) as {
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
      };

      return result;
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

  deleteUserEmbeddings(userId: string): Promise<boolean> {
    try {
      if (!this.aiServiceUrl || !this.aiServiceApiKey) {
        console.error('AI service URL or API key not configured');
        return Promise.resolve(false);
      }

      // Note: This would require a separate endpoint in the AI service
      // For now, we'll return false as this functionality isn't implemented yet
      console.warn('Delete user embeddings not implemented yet');
      return Promise.resolve(false);
    } catch (error) {
      console.error(`Error deleting embeddings for user ${userId}:`, error);
      return Promise.resolve(false);
    }
  }
}
