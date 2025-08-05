import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIService {
  private modalServiceUrl: string;
  private modalApiKey: string;
  private qdrantCollection: string;

  constructor(private configService: ConfigService) {
    this.modalServiceUrl = this.configService.get<string>(
      'MODAL_QUERY_DOCUMENTS_URL',
    );
    this.modalApiKey = this.configService.get<string>(
      'MODAL_DOT_COM_X_API_KEY',
    );
    this.qdrantCollection = this.configService.get<string>('QDRANT_COLLECTION');
  }

  async generateAIResponse(
    query: string,
    userId: string,
    context?: string,
  ): Promise<{
    response: string;
    sources: Array<{
      document: string;
      similarity: number;
      chunkId: string;
    }>;
  }> {
    try {
      if (!this.modalServiceUrl || !this.modalApiKey) {
        throw new Error('Modal service not configured');
      }

      console.log('Calling Modal.com API for AI response:', {
        url: this.modalServiceUrl,
        hasApiKey: !!this.modalApiKey,
        collection: this.qdrantCollection,
      });

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.modalApiKey,
      };

      // Add collection header if available
      if (this.qdrantCollection) {
        headers['x-collection'] = this.qdrantCollection;
      }

      const requestBody = {
        query: query,
        user_id: userId,
        history: context ? [{ role: 'user', content: context }] : [],
      };

      const response = await fetch(this.modalServiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Modal API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(
          `Failed to generate AI answer: ${response.status} - ${errorText}`,
        );
      }

      // Modal returns streaming response, so we need to process it
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body from Modal API');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let sources: Array<{
        document: string;
        similarity: number;
        chunkId: string;
      }> = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          // Parse SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6); // Remove 'data: ' prefix
                const data = JSON.parse(jsonStr) as {
                  response?: string;
                  sources?: Array<{
                    document: string;
                    similarity: number;
                    chunkId: string;
                  }>;
                  done?: boolean;
                };

                if (data.response) {
                  fullResponse += data.response;
                }
                if (data.sources) {
                  sources = data.sources;
                }
                if (data.done) {
                  // Stream is complete
                }
              } catch {
                // Ignore JSON parsing errors for non-JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Check if the response indicates no documents found
      if (
        fullResponse.includes('could not find any relevant information') ||
        sources.length === 0
      ) {
        throw new Error('Modal.com API could not find relevant documents');
      }

      return {
        response: fullResponse || 'No answer generated',
        sources: sources,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const healthCheckUrl = this.configService.get<string>(
        'MODAL_HEALTH_CHECK_URL',
      );
      if (!healthCheckUrl || !this.modalApiKey) {
        return false;
      }

      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        headers: {
          'x-api-key': this.modalApiKey,
        },
      });

      if (response.ok) {
        const healthData = await response.json();
        return healthData.status === 'healthy';
      }

      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
