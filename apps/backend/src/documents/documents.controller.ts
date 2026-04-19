import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  DocumentCategory,
  DocumentStatus,
  QueryType as DocumentQueryKind,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  PermissionGuard,
  PermissionResource,
  RequireCreate,
  RequireDelete,
  RequireRead,
} from '../common/permissions';
import { RedactingLogger } from '../common/logging';
import { ConversationContextService } from '../common/services/conversation-context.service';
import { QdrantService } from '../config/qdrant.service';
import { S3Service } from '../config/s3.config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto, DocumentsService } from './documents.service';
import { QueryType } from './dto/create-document-query.dto';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

// Import DocumentQuery interface
interface DocumentQuery {
  caseId?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
}

interface QueryRequest {
  query: string;
  mode?: 'search' | 'qa';
  context?: string;
  limit?: number;
  conversationHistory?: Array<{
    question: string;
    answer: string;
    timestamp?: string;
  }>;
}

// Define proper types for body objects
interface UploadDocumentBody {
  title?: string;
  description?: string;
  category?: string;
  caseId?: string;
}

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class DocumentsController {
  private readonly logger = new RedactingLogger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly qdrantService: QdrantService,
    private readonly prisma: PrismaService,
    private readonly conversationContextService: ConversationContextService,
  ) {}

  @Post()
  @RequireCreate(PermissionResource.DOCUMENT)
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    createDocumentDto.uploadedById = req.user.sub;
    return this.documentsService.create(createDocumentDto);
  }

  private getMaxDocumentSize(): number {
    return parseInt(
      this.configService.get<string>('MAX_DOCUMENT_SIZE') || '20971520',
    );
  }

  /** Trim and strip wrapping quotes from .env values (avoids Modal 401 vs API_KEY mismatch). */
  private normalizeEnvSecret(value: string | undefined): string | undefined {
    if (value == null) return undefined;
    let s = String(value).trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).trim();
    }
    return s || undefined;
  }

  /**
   * Modal secret `QURIEUS_KEY` supplies `API_KEY` on the GPU deployment — typically the same
   * value as `AI_SERVICE_API_KEY` (FastAPI ai-service). Prefer that to avoid `.env` drift;
   * set `MODAL_API_KEY` only when Modal intentionally uses a different key.
   */
  private getModalApiKey(): string | undefined {
    const sharedWithAiService = this.normalizeEnvSecret(
      this.configService.get<string>('AI_SERVICE_API_KEY'),
    );
    const modalOnly = this.normalizeEnvSecret(
      this.configService.get<string>('MODAL_API_KEY'),
    );
    return sharedWithAiService ?? modalOnly;
  }

  @Post('upload')
  @RequireCreate(PermissionResource.DOCUMENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Use memory storage to get file.buffer
      // No fileSize limit - let runtime validation handle it with proper error messages
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentBody,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size
    const maxSize = this.getMaxDocumentSize();
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes (${Math.round(maxSize / 1024 / 1024)}MB)`,
      );
    }

    const practiceId =
      await this.documentsService.resolvePracticeIdForDocumentUpload(
        req.user.sub,
      );

    let uploadedFileUrl: string | null = null;
    let createdDocument: {
      id: string;
      title: string;
      fileUrl: string;
      originalFilename: string;
      fileType: string;
      fileSize: number;
      category: DocumentCategory;
      uploadedById: string;
      createdAt: Date;
      updatedAt: Date;
      aiDocumentId: string;
    } | null = null;

    try {
      // Generate unique filename
      const fileName = this.s3Service.generateFileName(
        file.originalname,
        req.user.sub,
      );

      // Upload to S3
      uploadedFileUrl = await this.s3Service.uploadDocument(
        file.buffer,
        fileName,
        file.mimetype,
      );

      // Create document record
      const createDocumentDto: CreateDocumentDto = {
        title: body.title || '',
        description: body.description || '',
        fileUrl: uploadedFileUrl,
        originalFilename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        category: (body.category as DocumentCategory) || DocumentCategory.OTHER,
        caseId: body.caseId || undefined,
        uploadedById: req.user.sub,
        aiDocumentId: randomUUID(),
        practiceId,
      };

      createdDocument = await this.documentsService.create(createDocumentDto);

      // Process document using FastAPI service
      try {
        await this.ingestWithAiAndUpdateLegalDocument({
          legalDocumentId: createdDocument.id,
          fileBuffer: file.buffer,
          mimeType: file.mimetype,
          originalFilename: file.originalname,
          userId: req.user.sub,
          aiDocumentId: createdDocument.aiDocumentId,
          description: body.description,
        });
      } catch (error) {
        this.logger.error('Error processing document with FastAPI:', error);
        // Don't fail the upload if processing fails, but log it
        // The document will still be available for download
      }

      return createdDocument;
    } catch (error) {
      this.logger.error('Error uploading document:', error);

      // Rollback: Clean up any created resources
      if (createdDocument) {
        try {
          await this.documentsService.remove(createdDocument.id, req.user.sub);
        } catch (rollbackError) {
          this.logger.error(
            'Failed to rollback document record:',
            rollbackError,
          );
        }
      }

      if (uploadedFileUrl) {
        try {
          await this.s3Service.deleteDocument(uploadedFileUrl);
        } catch (rollbackError) {
          this.logger.error('Failed to rollback S3 file:', rollbackError);
        }
      }

      throw new BadRequestException('Failed to upload document');
    }
  }

  @Get('status/:aiDocumentId')
  @UseGuards(JwtAuthGuard)
  async getDocumentProcessingStatus(
    @Param('aiDocumentId') aiDocumentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const response = await fetch(
        `${this.configService.get('AI_SERVICE_URL')}/api/v1/admin/documents/status/${aiDocumentId}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`FastAPI service error: ${response.status}`);
      }

      const result = (await response.json()) as {
        status: { status: string };
      };

      // If processing is complete, update the database
      if (result.status?.status === 'COMPLETED') {
        await this.prisma.legalDocument.updateMany({
          where: {
            aiDocumentId: aiDocumentId,
            uploadedById: req.user.sub,
          },
          data: {
            status: 'PROCESSED',
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error checking document status:', error);
      throw new BadRequestException('Failed to check document status');
    }
  }

  @Post('search')
  @UseGuards(JwtAuthGuard)
  async searchDocuments(
    @Body() searchDto: { query: string; limit?: number },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const { query, limit = 10 } = searchDto;

      if (!this.qdrantService) {
        throw new BadRequestException('Vector database not available');
      }

      const searchResults = await this.qdrantService.searchDocuments(
        query,
        req.user.sub,
        limit,
      );

      const enhancedResults =
        await this.documentsService.enrichVectorSearchHits(
          searchResults,
          req.user.sub,
        );

      const result = {
        query,
        results: enhancedResults,
        total_results: enhancedResults.length,
        generated_at: new Date().toISOString(),
      };

      // Log the search query
      await this.documentsService.logDocumentQuery(
        req.user.sub,
        query,
        JSON.stringify(searchResults),
        undefined, // caseId
        searchResults, // sources
        undefined, // responseTime
        undefined, // tokensUsed
        QueryType.DOCUMENT_ANALYSIS,
      );

      return result;
    } catch (error) {
      this.logger.error('Error processing document search:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process search');
    }
  }

  @Post('query')
  @UseGuards(JwtAuthGuard)
  async queryDocuments(
    @Body() queryDto: QueryRequest,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const {
        query,
        mode = 'qa',
        context,
        limit = 10,
        conversationHistory = [],
      } = queryDto;

      this.logger.log('Document query request:', {
        query,
        mode,
        context,
        limit,
        conversationHistoryLength: conversationHistory.length,
        userId: req.user.sub,
      });

      if (!this.qdrantService) {
        throw new BadRequestException('Vector database not available');
      }

      // Check if Modal.com endpoint is configured
      const modalEndpointUrl = this.configService.get('MODAL_ENDPOINT_URL');
      const modalApiKey = this.getModalApiKey();

      if (!modalEndpointUrl || !modalApiKey) {
        throw new BadRequestException('Modal.com endpoint not configured');
      }

      // Get conversation history from backend instead of frontend
      const backendHistory = await this.getConversationHistory(
        req.user.sub,
        query,
      );

      // Use conversation context service to intelligently truncate history
      const { truncatedHistory, truncationInfo } =
        this.conversationContextService.truncateConversationHistory(
          backendHistory,
          query,
          context,
        );

      // Pre-validate context before sending to AI service
      const validation =
        this.conversationContextService.validateContextBeforeSending(
          truncatedHistory,
          query,
          context,
        );

      this.logger.log('Conversation context processing:', {
        originalHistoryCount: conversationHistory.length,
        backendHistoryCount: backendHistory.length,
        truncatedHistoryCount: truncatedHistory.length,
        truncationInfo,
        queryLength: query.length,
        contextLength: context?.length || 0,
        preValidation: validation,
      });

      // Use the validated history
      const finalHistory = validation.finalHistory;

      this.logger.log(
        'Using direct Modal.com integration with optimized conversation context',
      );
      return await this.queryDocumentsDirect(
        query,
        req.user.sub,
        limit,
        context,
        finalHistory, // Use validated history that's guaranteed to fit within token limits
      );
    } catch (error) {
      this.logger.error('Error processing document query:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process query');
    }
  }

  /**
   * Get conversation history from backend database instead of frontend
   */
  private async getConversationHistory(
    userId: string,
    _currentQuery: string,
  ): Promise<Array<{ question: string; answer: string; timestamp?: string }>> {
    try {
      // Get recent document queries for this user (more conservative limit)
      const recentQueries = await this.prisma.documentQuery.findMany({
        where: {
          userId,
          isDeleted: false, // Only get non-deleted queries
          // Exclude vector search-only logs (same table as Q&A; those are not chat)
          queryType: { not: DocumentQueryKind.DOCUMENT_ANALYSIS },
          // Optionally filter by case if needed
          // caseId: caseId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Reduced from 20 to 10 for more conservative token usage
        select: {
          question: true,
          answer: true,
          createdAt: true,
        },
      });

      // Convert to the expected format
      return recentQueries.map((query) => ({
        question: query.question,
        answer: query.answer,
        timestamp: query.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('Error fetching conversation history:', error);
      // Return empty array if there's an error - don't fail the entire request
      return [];
    }
  }

  /**
   * Build the final context string that will be sent to Modal.com
   * This helps with debugging token usage
   */
  private buildFinalContextString(
    documentContext: string,
    conversationHistory: Array<{
      question: string;
      answer: string;
      timestamp?: string;
    }>,
    query: string,
  ): string {
    let context = '';

    // Add document context
    if (documentContext) {
      context += `Document Context:\n${documentContext}\n\n`;
    }

    // Add conversation history
    if (conversationHistory.length > 0) {
      context += 'Conversation History:\n';
      conversationHistory.forEach((item, index) => {
        context += `Q${index + 1}: ${item.question}\n`;
        context += `A${index + 1}: ${item.answer}\n\n`;
      });
    }

    // Add current query
    context += `Current Question: ${query}`;

    return context;
  }

  private async queryDocumentsDirect(
    query: string,
    userId: string,
    limit: number,
    _context?: string, // Unused parameter, prefixed with _
    conversationHistory: Array<{
      question: string;
      answer: string;
      timestamp?: string;
    }> = [],
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
    generated_at: string;
  }> {
    try {
      // First, search Qdrant for relevant documents
      const searchResults = await this.qdrantService.searchDocuments(
        query,
        userId,
        limit,
      );

      if (!searchResults || searchResults.length === 0) {
        return {
          question: query,
          answer:
            "I couldn't find any relevant documents to answer your question. Please make sure you have uploaded documents and try asking a different question.",
          sources: [],
          confidence: 0.0,
          generated_at: new Date().toISOString(),
        };
      }

      // Build context from search results only (separate from conversation history)
      const documentContext = searchResults
        .map((result, index) => `Source ${index + 1}:\n${result.content}`)
        .join('\n\n');

      this.logger.log('Document context length:', documentContext.length);
      if (conversationHistory && conversationHistory.length > 0) {
        this.logger.log(
          `Sending ${conversationHistory.length} previous Q&A pairs as separate history`,
        );
      }

      // Build the final context string for logging
      const finalContextString = this.buildFinalContextString(
        documentContext,
        conversationHistory,
        query,
      );

      this.logger.log('Sending to Modal.com:', {
        queryLength: query.length,
        contextLength: documentContext.length,
        historyCount: conversationHistory.length,
        finalContextLength: finalContextString.length,
        estimatedTokens: Math.ceil(finalContextString.length / 4), // Rough token estimate
        maxAllowedTokens: 4096,
      });

      // Call Modal.com directly
      const modalResponse = await fetch(
        this.configService.get('MODAL_ENDPOINT_URL'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.getModalApiKey() ?? '',
            'X-Collection': this.configService.get('QDRANT_COLLECTION'),
          },
          body: JSON.stringify({
            query,
            user_id: userId,
            context: documentContext,
            history: conversationHistory,
            limit,
            collection_name: this.configService.get('QDRANT_COLLECTION'),
          }),
        },
      );

      // Modal.com returns streaming response, so we need to handle it differently
      const responseText = await modalResponse.text();

      if (!modalResponse.ok) {
        const detail = responseText?.slice(0, 500) || '';
        if (modalResponse.status === 401) {
          this.logger.error(
            'Modal.com 401: X-API-Key did not match Modal secret API_KEY (align AI_SERVICE_API_KEY or MODAL_API_KEY with QURIEUS_KEY).',
            detail,
          );
        }
        throw new Error(
          `Modal.com error: ${modalResponse.status}${detail ? ` — ${detail}` : ''}`,
        );
      }

      this.logger.log(
        'Modal.com response type:',
        modalResponse.headers.get('content-type'),
      );
      this.logger.log(
        'Modal.com response preview:',
        responseText.substring(0, 200),
      );

      // Parse the streaming response to extract the final answer
      let result: {
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

      try {
        // Try to parse as regular JSON first (Modal may rarely return a bare array of hits)
        const parsed = JSON.parse(responseText) as unknown;
        if (Array.isArray(parsed)) {
          result = {
            answer: JSON.stringify(parsed),
            sources: [],
            confidence: 0.8,
          };
        } else {
          result = parsed as typeof result;
        }
      } catch (_parseError) {
        // If that fails, try to parse streaming response
        const lines = responseText.split('\n');
        let finalResponse = '';
        let sources: any[] = [];
        let confidence = 0.8;

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.response) {
                finalResponse += data.response;
              }
              if (data.sources) {
                sources = data.sources;
              }
              if (data.confidence) {
                confidence = data.confidence;
              }
            } catch (_e) {
              // Skip invalid JSON lines
            }
          }
        }

        result = {
          answer:
            finalResponse ||
            "I couldn't generate a response. Please try again.",
          sources: sources,
          confidence: confidence,
        };
      }

      const formattedSources =
        await this.documentsService.enrichVectorSearchHits(
          searchResults,
          userId,
        );

      const answer = this.documentsService.normalizeDocumentQueryAnswer(
        result.answer,
        formattedSources,
      );

      // Log the Q&A query
      await this.documentsService.logDocumentQuery(
        userId,
        query,
        answer,
        undefined, // caseId
        searchResults, // sources
        undefined, // responseTime
        undefined, // tokensUsed
        QueryType.GENERAL,
      );

      return {
        question: query,
        answer,
        sources: formattedSources, // Use Qdrant results instead of Modal.com sources
        confidence: result.confidence,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Direct Modal.com error:', error);
      throw new BadRequestException('Failed to process document query');
    }
  }

  @Get()
  @RequireRead(PermissionResource.DOCUMENT)
  findAll(@Request() req: AuthenticatedRequest, @Query() query: DocumentQuery) {
    return this.documentsService.findAll(req.user.sub, query);
  }

  @Get('query-history')
  async getQueryHistory(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const queries = await this.prisma.documentQuery.findMany({
      where: {
        userId: req.user.sub,
        isDeleted: false, // Only show non-deleted queries
        // Document search logs share this table but are not AI assistant turns
        queryType: { not: DocumentQueryKind.DOCUMENT_ANALYSIS },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    return queries;
  }

  @Delete('query-history')
  @RequireDelete(PermissionResource.DOCUMENT)
  async clearQueryHistory(@Request() req: AuthenticatedRequest) {
    // Mark all document queries as deleted instead of hard deleting
    const result = await this.prisma.documentQuery.updateMany({
      where: {
        userId: req.user.sub,
        deletedAt: null, // Only update non-deleted queries
      },
      data: {
        deletedAt: new Date(),
        isDeleted: true,
      },
    });

    return {
      message: 'Query history cleared successfully',
      deletedCount: result.count,
    };
  }

  @Post(':id/retry-processing')
  @RequireCreate(PermissionResource.DOCUMENT)
  async retryDocumentProcessing(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const document = await this.documentsService.findOne(id, req.user.sub);

    if (document.status === 'PROCESSED') {
      throw new BadRequestException('Document is already processed');
    }

    if (!document.fileUrl) {
      throw new BadRequestException(
        'No stored file is available for this document. Please upload the file again.',
      );
    }

    const exists = await this.s3Service.checkDocumentExists(document.fileUrl);
    if (!exists) {
      throw new BadRequestException(
        'The file is no longer in storage (it may have been removed when processing was reset, or deleted). Please upload the document again.',
      );
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await this.s3Service.getDocumentAsBuffer(document.fileUrl);
    } catch {
      throw new BadRequestException(
        'Could not read the stored file. Please upload the document again.',
      );
    }

    if (fileBuffer.length === 0) {
      throw new BadRequestException(
        'Stored file is empty. Please upload the document again.',
      );
    }

    const newAiDocumentId = randomUUID();
    const safeTitle =
      document.title.replace(/[/\\?%*:|"<>]/g, '').trim() || 'document';
    const originalFilename =
      document.originalFilename ||
      `${safeTitle}${this.inferExtensionFromMime(document.fileType)}`;

    try {
      await this.ingestWithAiAndUpdateLegalDocument({
        legalDocumentId: document.id,
        fileBuffer,
        mimeType: document.fileType,
        originalFilename,
        userId: document.uploadedById,
        aiDocumentId: newAiDocumentId,
        description: document.description,
      });
    } catch (error) {
      this.logger.error('Retry processing failed:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to restart processing';
      throw new BadRequestException(message);
    }

    return this.documentsService.findOne(id, req.user.sub);
  }

  @Get(':id')
  @RequireRead(PermissionResource.DOCUMENT)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.documentsService.findOne(id, req.user.sub);
  }

  @Delete(':id')
  @RequireDelete(PermissionResource.DOCUMENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    this.logger.log(
      `Starting document deletion for ID: ${id} by user: ${req.user.sub}`,
    );

    const document = await this.documentsService.findOne(id, req.user.sub);
    this.logger.log('Document found for deletion:', {
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
    });

    try {
      // First, delete from database and Qdrant (this is the critical operation)
      this.logger.log(
        'Calling documentsService.remove to delete from DB and Qdrant...',
      );
      const deletedDocument = await this.documentsService.remove(
        id,
        req.user.sub,
      );
      this.logger.log('Successfully deleted from database and Qdrant');

      // Then, clean up S3 files (this is less critical, can fail without breaking the operation)
      this.logger.log('Starting S3 cleanup...');

      // Delete main document file from S3
      if (document.fileUrl) {
        try {
          this.logger.log(
            `Deleting main document from S3: ${document.fileUrl}`,
          );
          await this.s3Service.deleteDocument(document.fileUrl);
          this.logger.log('Main document deleted from S3 successfully');
        } catch (error) {
          this.logger.error('Failed to delete main document from S3:', error);
          // Continue with deletion even if S3 cleanup fails
        }
      }

      this.logger.log('Document deletion completed successfully');
      return deletedDocument;
    } catch (error) {
      this.logger.error('Error during document deletion:', error);
      throw error;
    }
  }

  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(
        `Download request for document ID: ${id} by user: ${req.user.sub}`,
      );

      const document = await this.documentsService.findOne(id, req.user.sub);
      this.logger.log('Document found:', {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
      });

      const fileUrl = document.fileUrl;

      if (!fileUrl) {
        this.logger.error(`No fileUrl found for document ${id}`);
        throw new BadRequestException(
          'File not found - document has no associated file',
        );
      }

      this.logger.log(`Fetching file from S3: ${fileUrl}`);

      // Get the file buffer from S3
      this.logger.log(`About to fetch file from S3 with key: ${fileUrl}`);
      const fileBuffer = await this.s3Service.getDocumentAsBuffer(fileUrl);
      this.logger.log(`File buffer received, size: ${fileBuffer.length} bytes`);

      // Check if the file is empty
      if (fileBuffer.length === 0) {
        this.logger.error(`File is empty: ${fileUrl}`);
        throw new BadRequestException('File is empty or corrupted');
      }

      // Get the file extension and determine content type
      const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';

      switch (fileExtension) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'doc':
          contentType = 'application/msword';
          break;
        case 'docx':
          contentType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          contentType = 'text/plain';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
      }

      // Set response headers for file download
      res.setHeader('Content-Type', contentType);

      // Use original filename from database or fallback to document title
      const originalFilename = document.originalFilename;
      const filename =
        originalFilename || `${document.title || 'document'}.${fileExtension}`;

      this.logger.log('Download filename details:', {
        fileUrl,
        originalFilename,
        documentTitle: document.title,
        fileExtension,
        finalFilename: filename,
      });

      // Ensure filename is properly encoded for Content-Disposition header
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      );
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      this.logger.log(
        `Sending file with content type: ${contentType}, size: ${fileBuffer.length} bytes`,
      );

      return res.send(fileBuffer);
    } catch (error) {
      this.logger.error('Error in downloadDocument:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && error.message?.includes('not found')) {
        throw new BadRequestException('Document not found');
      }

      if (error instanceof Error && error.message?.includes('Access denied')) {
        throw new BadRequestException('Access denied to this document');
      }

      throw new BadRequestException('Error accessing document');
    }
  }

  private inferExtensionFromMime(fileType: string): string {
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return '.pdf';
    if (t.includes('wordprocessingml')) return '.docx';
    if (t.includes('msword')) return '.doc';
    if (t.includes('text/plain')) return '.txt';
    if (t.includes('png')) return '.png';
    if (t.includes('jpeg') || t.includes('jpg')) return '.jpg';
    if (t.includes('gif')) return '.gif';
    return '.bin';
  }

  /**
   * Sends a stored file buffer to the AI service and updates the legal document row.
   */
  private async ingestWithAiAndUpdateLegalDocument(params: {
    legalDocumentId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalFilename: string;
    userId: string;
    aiDocumentId: string;
    description?: string | null;
  }): Promise<void> {
    const {
      legalDocumentId,
      fileBuffer,
      mimeType,
      originalFilename,
      userId,
      aiDocumentId,
      description,
    } = params;

    const formData = new FormData();
    const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append('files', fileBlob, originalFilename);
    formData.append('userId', userId);
    formData.append('documentIds', JSON.stringify([aiDocumentId]));
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch(
      `${this.configService.get('AI_SERVICE_URL')}/api/v1/admin/documents/upload`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText) as { detail?: unknown };
        if (parsed?.detail != null) {
          detail =
            typeof parsed.detail === 'string'
              ? parsed.detail
              : JSON.stringify(parsed.detail);
        }
      } catch {
        /* keep raw body */
      }
      this.logger.error(
        'FastAPI service error:',
        response.status,
        detail.slice(0, 2000),
      );
      throw new Error(`FastAPI service error: ${response.status} - ${detail}`);
    }

    const result = (await response.json()) as {
      processing_status: string;
      documents: Array<{
        document_id: string;
        status: string;
        chunks?: number;
        content?: string;
      }>;
    };

    if (result.processing_status === 'BACKGROUND') {
      const documentInfo = result.documents[0];

      this.logger.log(
        'Document uploaded and processing started in background:',
        {
          documentId: documentInfo.document_id,
          status: documentInfo.status,
        },
      );

      await this.prisma.legalDocument.update({
        where: { id: legalDocumentId },
        data: {
          aiDocumentId: documentInfo.document_id,
          status: 'PROCESSING',
        },
      });

      this.logger.log(
        'Document uploaded successfully, processing in background:',
        {
          documentId: legalDocumentId,
          aiDocumentId: documentInfo.document_id,
        },
      );
    } else {
      const documentInfo = result.documents[0];

      this.logger.log('Document processed synchronously by FastAPI:', {
        documentId: documentInfo.document_id,
        chunks: documentInfo.chunks,
        contentLength: documentInfo.content?.length || 0,
      });

      await this.prisma.legalDocument.update({
        where: { id: legalDocumentId },
        data: {
          aiDocumentId: documentInfo.document_id,
          aiChunks: documentInfo.chunks,
          content: documentInfo.content,
          status: 'PROCESSED',
        },
      });

      this.logger.log('Document processing completed successfully:', {
        documentId: legalDocumentId,
        chunks: documentInfo.chunks,
        contentLength: documentInfo.content?.length || 0,
      });
    }
  }
}
