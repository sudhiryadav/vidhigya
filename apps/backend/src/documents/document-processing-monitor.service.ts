import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DocumentStatus } from '@prisma/client';
import { S3Service } from '../config/s3.config';
import { LogsService } from '../logs/logs.service';
import { PrismaService } from '../prisma/prisma.service';

interface DocumentInfo {
  id: string;
  aiDocumentId: string;
  title: string;
  uploadedById: string;
  updatedAt: Date;
  fileUrl?: string;
  originalFilename?: string;
}

interface ProcessingStatus {
  status: string;
  details?: string;
  error?: string;
  progress?: number;
  timestamp?: string;
}

@Injectable()
export class DocumentProcessingMonitorService {
  private readonly logger = new Logger(DocumentProcessingMonitorService.name);
  private readonly maxRetries = 3;
  private readonly processingTimeout = 10 * 60 * 1000; // 10 minutes
  private readonly healthCheckInterval = 30 * 1000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Monitor document processing status every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorDocumentProcessing() {
    try {
      // Check if FastAPI service is healthy
      const isHealthy = await this.checkFastAPIHealth();

      if (!isHealthy) {
        this.logger.warn(
          'FastAPI service is not responding, will retry processing when it comes back online',
        );
        return;
      }

      // Find documents that are stuck in processing
      const stuckDocuments = await this.findStuckDocuments();

      for (const document of stuckDocuments) {
        await this.handleStuckDocument(document);
      }

      // Check for documents that need retry
      const retryDocuments = await this.findDocumentsNeedingRetry();

      for (const document of retryDocuments) {
        await this.retryDocumentProcessing(document);
      }
    } catch (error) {
      this.logger.error('Error in document processing monitor:', error);
    }
  }

  /**
   * Check if FastAPI service is healthy
   */
  private async checkFastAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.configService.get('AI_SERVICE_URL')}/health`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        },
      );

      return response.ok;
    } catch (error) {
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(
          'FastAPI health check failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
      return false;
    }
  }

  /**
   * Find documents that are stuck in processing (no updates for too long)
   */
  private async findStuckDocuments(): Promise<DocumentInfo[]> {
    const timeoutThreshold = new Date(Date.now() - this.processingTimeout);

    return this.prisma.legalDocument.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: {
          lt: timeoutThreshold,
        },
        aiDocumentId: {
          not: null,
        },
      },
      select: {
        id: true,
        aiDocumentId: true,
        title: true,
        uploadedById: true,
        updatedAt: true,
        fileUrl: true,
        originalFilename: true,
      },
    });
  }

  /**
   * Find documents that need retry (failed processing with retry attempts left)
   */
  private async findDocumentsNeedingRetry(): Promise<DocumentInfo[]> {
    return this.prisma.legalDocument.findMany({
      where: {
        status: 'PROCESSING',
        aiDocumentId: {
          not: null,
        },
        // Add a custom field for retry count if needed
        // For now, we'll use a simple approach
      },
      select: {
        id: true,
        aiDocumentId: true,
        title: true,
        uploadedById: true,
        updatedAt: true,
        fileUrl: true,
        originalFilename: true,
      },
    });
  }

  /**
   * Handle a document that appears to be stuck in processing
   */
  private async handleStuckDocument(document: DocumentInfo) {
    try {
      this.logger.log(
        `Document ${document.id} appears stuck, checking status...`,
      );

      // Check current status from FastAPI
      const currentStatus = await this.getDocumentStatusFromFastAPI(
        document.aiDocumentId,
      );

      if (currentStatus) {
        // Update document status based on FastAPI response
        await this.updateDocumentStatus(document.id, currentStatus);

        if (
          currentStatus.status === 'COMPLETED' ||
          currentStatus.status === 'ERROR' ||
          currentStatus.status === 'CANCELLED'
        ) {
          this.logger.log(
            `Document ${document.id} status updated to ${currentStatus.status}`,
          );
          return;
        }
      }

      // If still processing but stuck, check if we can restart it
      // Only attempt restart if we haven't tried recently
      const lastAttemptKey = `restart_attempt_${document.id}`;
      const lastAttempt = this.getLastRestartAttempt(lastAttemptKey);
      const timeSinceLastAttempt = Date.now() - lastAttempt;

      if (timeSinceLastAttempt < 5 * 60 * 1000) {
        // 5 minutes between attempts
        this.logger.log(
          `Document ${document.id} restart attempted recently, skipping...`,
        );
        return;
      }

      await this.handleStuckDocumentWithS3Check(document);

      // Record this restart attempt
      this.recordRestartAttempt(lastAttemptKey);
    } catch (error) {
      this.logger.error(`Error handling stuck document ${document.id}:`, error);
    }
  }

  // Track restart attempts to prevent spam
  private restartAttempts = new Map<string, number>();

  private getLastRestartAttempt(key: string): number {
    return this.restartAttempts.get(key) || 0;
  }

  private recordRestartAttempt(key: string): void {
    this.restartAttempts.set(key, Date.now());
  }

  /**
   * Handle stuck document with S3 data check
   */
  private async handleStuckDocumentWithS3Check(document: DocumentInfo) {
    try {
      this.logger.log(`Checking S3 for document ${document.id} data...`);

      // Check if document data exists in S3
      let s3DataExists = false;
      if (document.fileUrl) {
        try {
          s3DataExists = await this.s3Service.checkDocumentExists(
            document.fileUrl,
          );
          this.logger.log(
            `S3 data check for ${document.id}: ${s3DataExists ? 'EXISTS' : 'NOT_FOUND'}`,
          );
        } catch (error) {
          this.logger.error(
            `Error checking S3 for document ${document.id}:`,
            error,
          );
          s3DataExists = false;
        }
      }

      if (s3DataExists) {
        // Data exists in S3, try to restart processing
        this.logger.log(
          `S3 data found for ${document.id}, attempting to restart processing...`,
        );
        await this.restartDocumentProcessingFromS3(document);
      } else {
        // No data in S3, mark for user re-upload
        this.logger.warn(
          `No S3 data found for ${document.id}, marking for user re-upload`,
        );
        await this.markDocumentForReupload(document);
      }
    } catch (error) {
      this.logger.error(
        `Error in S3 check for document ${document.id}:`,
        error,
      );
    }
  }

  /**
   * Restart document processing using S3 data
   */
  private async restartDocumentProcessingFromS3(
    document: DocumentInfo,
  ): Promise<boolean> {
    try {
      // Check if FastAPI service is healthy
      const isHealthy = await this.checkFastAPIHealth();
      if (!isHealthy && this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(
          `FastAPI service not healthy, cannot restart processing for ${document.id}`,
        );
        return false;
      }

      // Get document data from S3
      const documentBuffer = await this.s3Service.getDocumentAsBuffer(
        document.fileUrl,
      );

      // Call FastAPI upload endpoint to restart processing
      const formData = new FormData();
      formData.append(
        'files',
        new Blob([documentBuffer]),
        document.originalFilename || 'document',
      );
      formData.append('userId', document.uploadedById);

      const response = await fetch(
        `${this.configService.get('AI_SERVICE_URL')}/api/v1/admin/documents/upload`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
          },
          body: formData,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        },
      );

      if (response.ok) {
        const result = await response.json();
        this.logger.log(
          `Successfully restarted processing for document ${document.id}: ${result.message}`,
        );

        // Update document status to show it's being restarted
        await this.prisma.legalDocument.update({
          where: { id: document.id },
          data: {
            status: 'PROCESSING',
            updatedAt: new Date(),
          },
        });

        await this.logsService.create({
          level: 'info',
          message: `Document processing restarted from S3 for ${document.title}`,
          userId: document.uploadedById,
          meta: {
            documentId: document.id,
            aiDocumentId: document.aiDocumentId,
            action: 'processing_restart_from_s3',
            s3Key: document.fileUrl,
          },
        });
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(
          `Failed to restart processing for document ${document.id}: ${response.status} - ${errorText}`,
        );

        await this.logsService.create({
          level: 'error',
          message: `Failed to restart document processing from S3 for ${document.title}`,
          userId: document.uploadedById,
          meta: {
            documentId: document.id,
            aiDocumentId: document.aiDocumentId,
            action: 'processing_restart_from_s3_failed',
            error: errorText,
          },
        });
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error restarting processing from S3 for document ${document.id}:`,
        error,
      );

      await this.logsService.create({
        level: 'error',
        message: `Error restarting document processing from S3 for ${document.title}`,
        userId: document.uploadedById,
        meta: {
          documentId: document.id,
          aiDocumentId: document.aiDocumentId,
          action: 'processing_restart_from_s3_error',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  /**
   * Mark document for user re-upload with complete cleanup
   */
  private async markDocumentForReupload(document: DocumentInfo) {
    try {
      const previousFileUrl = document.fileUrl;
      this.logger.warn(
        `Document ${document.id} marked for re-upload - implementing complete cleanup`,
      );

      // After a successful S3 delete, clear the stored key so the API does not report a file
      // that no longer exists (retry must prompt for a new upload, not "missing from storage").
      let fileUrlAfterS3: string = previousFileUrl ?? '';

      // 1. Delete from S3 if fileUrl exists
      if (document.fileUrl) {
        try {
          this.logger.log(`Deleting document from S3: ${document.fileUrl}`);
          await this.s3Service.deleteDocument(document.fileUrl);
          fileUrlAfterS3 = '';
          this.logger.log(
            `Successfully deleted document from S3: ${document.fileUrl}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to delete document from S3: ${document.fileUrl}`,
            error,
          );
          // Continue with cleanup even if S3 deletion fails
        }
      }

      // 2. Delete from Qdrant if aiDocumentId exists
      if (document.aiDocumentId) {
        try {
          this.logger.log(
            `Deleting document from Qdrant: ${document.aiDocumentId}`,
          );
          await this.deleteFromQdrant(document.aiDocumentId);
          this.logger.log(
            `Successfully deleted document from Qdrant: ${document.aiDocumentId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to delete document from Qdrant: ${document.aiDocumentId}`,
            error,
          );
          // Continue with cleanup even if Qdrant deletion fails
        }
      }

      // 3. Update database status to indicate it needs re-upload
      await this.prisma.legalDocument.update({
        where: { id: document.id },
        data: {
          status: 'DRAFT', // Change to DRAFT to indicate it needs re-upload
          aiDocumentId: null, // Clear the AI document ID
          fileUrl: fileUrlAfterS3,
          updatedAt: new Date(),
        },
      });

      await this.logsService.create({
        level: 'warn',
        message: `Document ${document.title} rolled back - needs re-upload`,
        userId: document.uploadedById,
        meta: {
          documentId: document.id,
          aiDocumentId: document.aiDocumentId,
          action: 'mark_for_reupload',
          reason: 's3_data_not_found',
          s3Key: previousFileUrl,
          cleanupCompleted: true,
        },
      });

      this.logger.log(`Complete cleanup completed for document ${document.id}`);
    } catch (error) {
      this.logger.error(
        `Error marking document ${document.id} for re-upload:`,
        error,
      );
    }
  }

  /**
   * Delete document from Qdrant vector database
   */
  private async deleteFromQdrant(aiDocumentId: string): Promise<void> {
    try {
      // Import QdrantService dynamically to avoid circular dependencies
      const { QdrantService } = await import('../config/qdrant.service');
      const { EmbeddingService } = await import('../config/embedding.service');

      const embeddingService = new EmbeddingService(this.configService);
      const qdrantService = new QdrantService(
        this.configService,
        embeddingService,
      );

      // Delete the document embeddings from Qdrant
      await qdrantService.deleteDocumentEmbeddings(aiDocumentId);
    } catch (error) {
      this.logger.error(`Error deleting from Qdrant: ${error}`);
      throw error;
    }
  }

  /**
   * Retry processing for a document
   */
  private async retryDocumentProcessing(document: DocumentInfo) {
    try {
      this.logger.log(`Retrying processing for document ${document.id}...`);

      // Check if FastAPI service is healthy before retry
      const isHealthy = await this.checkFastAPIHealth();
      if (!isHealthy) {
        this.logger.warn(
          `FastAPI service not healthy, skipping retry for document ${document.id}`,
        );
        return;
      }

      // Attempt to restart processing
      const success = await this.restartDocumentProcessing(document);

      if (success) {
        this.logger.log(
          `Successfully restarted processing for document ${document.id}`,
        );

        await this.logsService.create({
          level: 'info',
          message: `Document processing restarted for ${document.title}`,
          userId: document.uploadedById,
          meta: {
            documentId: document.id,
            aiDocumentId: document.aiDocumentId,
            action: 'processing_restart',
          },
        });
      } else {
        this.logger.error(
          `Failed to restart processing for document ${document.id}`,
        );

        await this.logsService.create({
          level: 'error',
          message: `Failed to restart document processing for ${document.title}`,
          userId: document.uploadedById,
          meta: {
            documentId: document.id,
            aiDocumentId: document.aiDocumentId,
            action: 'processing_restart_failed',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error retrying document processing ${document.id}:`,
        error,
      );
    }
  }

  /**
   * Get document status from FastAPI service
   */
  private async getDocumentStatusFromFastAPI(
    aiDocumentId: string,
  ): Promise<ProcessingStatus | null> {
    try {
      const response = await fetch(
        `${this.configService.get('AI_SERVICE_URL')}/api/v1/admin/documents/status/${aiDocumentId}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        },
      );

      if (response.ok) {
        const result = await response.json();
        return result.status;
      }

      return null;
    } catch (error) {
      this.logger.debug(
        `Failed to get status for AI document ${aiDocumentId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Update document status in database
   */
  private async updateDocumentStatus(
    documentId: string,
    status: ProcessingStatus,
  ) {
    try {
      let dbStatus: DocumentStatus = 'PROCESSING';

      if (status.status === 'COMPLETED') {
        dbStatus = 'PROCESSED';
      } else if (status.status === 'ERROR') {
        dbStatus = 'PROCESSING'; // Keep as processing to allow retry
      } else if (status.status === 'CANCELLED') {
        dbStatus = 'DRAFT';
      }

      await this.prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          status: dbStatus,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating document status for ${documentId}:`,
        error,
      );
    }
  }

  /**
   * Mark document for retry
   */
  private async markDocumentForRetry(documentId: string) {
    try {
      await this.prisma.legalDocument.update({
        where: { id: documentId },
        data: {
          status: 'PROCESSING', // Keep as processing
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error marking document ${documentId} for retry:`,
        error,
      );
    }
  }

  /**
   * Restart document processing
   */
  private async restartDocumentProcessing(
    document: DocumentInfo,
  ): Promise<boolean> {
    try {
      // Call FastAPI endpoint to restart processing
      const response = await fetch(
        `${this.configService.get('AI_SERVICE_URL')}/api/v1/admin/documents/restart-processing/${document.aiDocumentId}`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        },
      );

      if (response.ok) {
        const result = await response.json();
        this.logger.log(
          `Successfully restarted processing for document ${document.id}: ${result.message}`,
        );

        // Update document timestamp to give it another chance
        await this.prisma.legalDocument.update({
          where: { id: document.id },
          data: {
            updatedAt: new Date(),
          },
        });

        return true;
      } else if (response.status === 404) {
        // FastAPI tracks active processing in-memory. A service reload can
        // return 404 for a valid aiDocumentId that is no longer in that map.
        // Do NOT perform destructive rollback on this signal alone.
        this.logger.warn(
          `Document ${document.id} not found in FastAPI queue (404). Trying S3 restart instead of rollback.`,
        );
        if (document.fileUrl) {
          const restarted =
            await this.restartDocumentProcessingFromS3(document);
          if (restarted) {
            return true;
          }
        }
        await this.markDocumentForRetry(document.id);
        return false;
      } else {
        const errorText = await response.text();
        this.logger.error(
          `Failed to restart processing for document ${document.id}: ${response.status} - ${errorText}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error restarting processing for document ${document.id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Immediate rollback when document cannot be restarted
   */
  private async immediateRollback(document: DocumentInfo, reason: string) {
    try {
      this.logger.warn(
        `Implementing immediate rollback for document ${document.id}: ${reason}`,
      );

      // Use the same cleanup logic as markDocumentForReupload
      await this.markDocumentForReupload(document);

      // Log the immediate rollback
      await this.logsService.create({
        level: 'error',
        message: `Document ${document.title} immediate rollback - ${reason}`,
        userId: document.uploadedById,
        meta: {
          documentId: document.id,
          aiDocumentId: document.aiDocumentId,
          action: 'immediate_rollback',
          reason: reason,
          s3Key: document.fileUrl,
          cleanupCompleted: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error during immediate rollback for document ${document.id}:`,
        error,
      );
    }
  }

  /**
   * Manual trigger to check and fix stuck documents
   */
  async manualHealthCheck() {
    this.logger.log('Manual health check triggered');
    await this.monitorDocumentProcessing();
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    const totalProcessing = await this.prisma.legalDocument.count({
      where: { status: 'PROCESSING' },
    });

    const totalProcessed = await this.prisma.legalDocument.count({
      where: { status: 'PROCESSED' },
    });

    const stuckDocuments = await this.findStuckDocuments();

    return {
      totalProcessing,
      totalProcessed,
      stuckDocuments: stuckDocuments.length,
      lastCheck: new Date(),
    };
  }
}
