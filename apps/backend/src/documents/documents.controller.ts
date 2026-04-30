import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
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
import { extname } from 'path';
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
import { NotificationEmitterService } from '../notifications/notification-emitter.service';
import { CreateDocumentDto, DocumentsService } from './documents.service';
import { QueryType } from './dto/create-document-query.dto';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import { GoogleOcrService } from './google-ocr.service';

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
  caseId?: string;
  documentId?: string;
  conversationHistory?: Array<{
    question: string;
    answer: string;
    timestamp?: string;
  }>;
}

interface UiProcessingStatus {
  status: string;
  details?: string;
  error?: string;
  progress?: number;
  timestamp?: string;
}

interface ProcessingDiagnostics {
  statusSource: 'ai-service' | 'backend-fallback';
  ocrProvider: 'current' | 'google';
  note?: string;
}

interface GoogleFileRecord {
  name: string;
  uri: string;
  mimeType: string;
}

interface GoogleBackedDocument {
  id: string;
  title: string;
  aiDocumentId: string | null;
  fileUrl: string;
  fileType: string;
  originalFilename: string | null;
}

// Define proper types for body objects
interface UploadDocumentBody {
  title?: string;
  description?: string;
  category?: string;
  caseId?: string;
}

const HARD_UPLOAD_SIZE_LIMIT_BYTES = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
];
const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
];

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class DocumentsController {
  private readonly logger = new RedactingLogger(DocumentsController.name);
  private readonly localProcessingStatus = new Map<
    string,
    UiProcessingStatus
  >();

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly qdrantService: QdrantService,
    private readonly prisma: PrismaService,
    private readonly notificationEmitter: NotificationEmitterService,
    private readonly conversationContextService: ConversationContextService,
    private readonly googleOcrService: GoogleOcrService,
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

  private getAiProvider(): 'current' | 'google' {
    const provider = this.configService.get<string>('DOCUMENT_AI_PROVIDER');
    if ((provider || '').toLowerCase() === 'google') {
      return 'google';
    }
    return 'current';
  }

  private getGoogleApiKey(): string | undefined {
    return this.normalizeEnvSecret(
      this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY') ??
        this.configService.get<string>('GOOGLE_API_KEY'),
    );
  }

  private getGoogleQueryModel(): string {
    return (
      this.configService.get<string>('GOOGLE_QUERY_MODEL') || 'gemini-2.5-flash'
    );
  }

  private getGoogleQueryFallbackModels(): string[] {
    const raw =
      this.configService.get<string>('GOOGLE_QUERY_FALLBACK_MODELS') ||
      'gemini-2.5-flash-lite,gemini-1.5-flash';
    return raw
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }

  private getGoogleQueryCandidateModels(): string[] {
    return [
      ...new Set([
        this.getGoogleQueryModel(),
        ...this.getGoogleQueryFallbackModels(),
      ]),
    ];
  }

  private shouldTryNextGoogleModel(
    status: number,
    payload: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    } | null,
  ): boolean {
    if (status !== 404) return false;
    const message = (payload?.error?.message || '').toLowerCase();
    return (
      message.includes('no longer available') ||
      message.includes('not found') ||
      message.includes('not supported') ||
      message.length === 0
    );
  }

  private getGoogleQueryMaxChunks(): number {
    const raw = Number(
      this.configService.get<string>('GOOGLE_QUERY_MAX_CHUNKS'),
    );
    if (!Number.isFinite(raw)) {
      return 8;
    }
    return Math.max(3, Math.min(Math.floor(raw), 20));
  }

  private getGoogleQueryMaxContextChars(): number {
    const raw = Number(
      this.configService.get<string>('GOOGLE_QUERY_MAX_CONTEXT_CHARS'),
    );
    if (!Number.isFinite(raw)) {
      return 12_000;
    }
    return Math.max(4_000, Math.min(Math.floor(raw), 60_000));
  }

  private detectGoogleQueryIntent(
    query: string,
  ): 'case_brief' | 'summary' | 'fact_lookup' | 'general' {
    const q = (query || '').toLowerCase();
    if (!q.trim()) return 'general';
    if (
      /\b(case\s*brief|brief\s+the\s+case|prepare\s+case\s+brief|draft\s+case\s+brief)\b/i.test(
        q,
      )
    ) {
      return 'case_brief';
    }
    if (/\b(summary|summari[sz]e|overview|tldr|gist|key\s+points)\b/i.test(q)) {
      return 'summary';
    }
    if (
      /\b(who|when|where|what|which|name|party|petitioner|respondent|section|date|amount)\b/i.test(
        q,
      )
    ) {
      return 'fact_lookup';
    }
    return 'general';
  }

  private parseIntentFromText(
    raw: string | undefined,
  ): 'case_brief' | 'summary' | 'fact_lookup' | 'general' | null {
    const text = (raw || '').toLowerCase();
    if (!text) return null;
    if (text.includes('case_brief')) return 'case_brief';
    if (text.includes('fact_lookup')) return 'fact_lookup';
    if (text.includes('summary')) return 'summary';
    if (text.includes('general')) return 'general';
    return null;
  }

  private async classifyIntentWithGoogle(
    query: string,
    apiKey: string,
  ): Promise<'case_brief' | 'summary' | 'fact_lookup' | 'general' | null> {
    if (!query.trim()) return null;
    const model = this.getGoogleQueryModel();
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Classify the user query intent into exactly one label: ' +
                'case_brief | summary | fact_lookup | general. ' +
                'Respond with ONLY the label and nothing else.',
            },
            { text: `Query: ${query}` },
          ],
        },
      ],
    });
    try {
      const result = await this.callGoogleGenerateContent(endpoint, body);
      if (result.status !== 200) return null;
      const raw =
        result.payload?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join(' ')
          .trim() || '';
      return this.parseIntentFromText(raw);
    } catch {
      return null;
    }
  }

  private buildGoogleInstructionByIntent(
    intent: 'case_brief' | 'summary' | 'fact_lookup' | 'general',
  ): string {
    const base =
      'You are a legal document assistant. Use ONLY the provided retrieved source snippets. ' +
      'Do not invent names, dates, values, or roles. If snippets are insufficient, explicitly say what is missing.';

    if (intent === 'case_brief') {
      return (
        `${base} ` +
        'The user asked for a case brief. Write a concise, professional brief (not a full rephrasing of the whole document). ' +
        'Cover the key parties, core facts, issue in dispute, and relief sought when available. ' +
        'Keep it crisp and to the point (about 120-180 words unless the user asks otherwise). ' +
        'Use citations like [Source N] after factual statements.'
      );
    }
    if (intent === 'summary') {
      return (
        `${base} ` +
        'Provide a concise summary tuned to the question, avoiding repetition and unnecessary detail. ' +
        'Use citations like [Source N].'
      );
    }
    if (intent === 'fact_lookup') {
      return (
        `${base} ` +
        'Answer directly with short factual statements and include citations like [Source N].'
      );
    }
    return (
      `${base} ` +
      'Answer naturally and professionally, matching user intent and requested depth. ' +
      'Use citations like [Source N] when asserting facts.'
    );
  }

  private inferCaseFromQuery(
    query: string,
    options: Array<{
      caseId: string;
      caseTitle: string;
      caseNumber: string | null;
      docIds: string[];
      docCount: number;
    }>,
  ): string | null {
    const q = (query || '').toLowerCase();
    if (!q.trim()) return null;

    const matched = options.filter((opt) => {
      const title = (opt.caseTitle || '').toLowerCase();
      const number = (opt.caseNumber || '').toLowerCase();
      return (
        (title.length >= 4 && q.includes(title)) ||
        (number.length >= 3 && q.includes(number))
      );
    });
    if (matched.length === 1) {
      return matched[0].caseId;
    }
    return null;
  }

  private extractIntentTerms(query: string): string[] {
    const stop = new Set([
      'the',
      'a',
      'an',
      'about',
      'case',
      'matter',
      'tell',
      'me',
      'of',
      'for',
      'and',
      'vs',
      'v',
      'v.',
      'state',
      'please',
      'prepare',
      'brief',
      'summary',
      'document',
      'documents',
    ]);
    return (query || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !stop.has(t));
  }

  private scoreQueryAgainstText(
    queryTerms: string[],
    haystack: string,
  ): number {
    if (!queryTerms.length || !haystack) return 0;
    const h = haystack.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (h.includes(term)) {
        score += term.length >= 6 ? 3 : 2;
      }
    }
    return score;
  }

  @Post('upload')
  @RequireCreate(PermissionResource.DOCUMENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Use memory storage to get file.buffer
      limits: {
        fileSize: HARD_UPLOAD_SIZE_LIMIT_BYTES,
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        const extension = extname(file.originalname || '').toLowerCase();
        const isAllowedMime = ALLOWED_DOCUMENT_MIME_TYPES.includes(
          file.mimetype,
        );
        const isAllowedExtension =
          extension.length > 0 &&
          ALLOWED_DOCUMENT_EXTENSIONS.includes(extension);
        if (isAllowedMime && isAllowedExtension) {
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
        status: DocumentStatus.PROCESSING,
        caseId: body.caseId?.trim() || undefined,
        uploadedById: req.user.sub,
        aiDocumentId: randomUUID(),
        practiceId,
      };

      createdDocument = await this.documentsService.create(createDocumentDto);

      // Kick off processing in the background so the upload HTTP request returns fast.
      // This avoids the UI staying stuck on "Uploading..." while OCR/ingestion runs.
      void this.processDocumentInBackground({
        legalDocumentId: createdDocument.id,
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        userId: req.user.sub,
        aiDocumentId: createdDocument.aiDocumentId,
        description: body.description,
      });

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
    const ocrProvider = this.getOcrProvider();
    const aiProvider = this.getAiProvider();

    if (aiProvider === 'google') {
      // In Google mode we still rely on AI-service for embeddings/background
      // ingestion. Prefer live AI-service status when available, and only then
      // fall back to local/backend checkpoints.
      if (!aiDocumentId.startsWith('files/')) {
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

          if (response.ok) {
            const result = (await response.json()) as {
              status: { status: string };
            };

            if (result.status?.status === 'COMPLETED') {
              await this.prisma.legalDocument.updateMany({
                where: {
                  aiDocumentId,
                  uploadedById: req.user.sub,
                },
                data: {
                  status: 'PROCESSED',
                },
              });
            } else if (result.status?.status === 'CANCELLED') {
              await this.prisma.legalDocument.updateMany({
                where: {
                  aiDocumentId,
                  uploadedById: req.user.sub,
                },
                data: {
                  status: 'DRAFT',
                },
              });
            }

            return {
              status: result.status,
              diagnostics: {
                statusSource: 'ai-service',
                ocrProvider,
                note: 'Google mode is using live AI-service processing status.',
              } satisfies ProcessingDiagnostics,
            };
          }
        } catch (error) {
          this.logger.warn(
            'Google mode AI-service status lookup failed; using backend fallback status.',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      const fallback = await this.buildFallbackProcessingStatus(
        aiDocumentId,
        req.user.sub,
      );
      return {
        status:
          fallback ??
          ({
            status: 'PROCESSING',
            details: 'Processing with Google AI in background...',
            progress: 10,
            timestamp: new Date().toISOString(),
          } satisfies UiProcessingStatus),
        diagnostics: {
          statusSource: 'backend-fallback',
          ocrProvider,
          note: 'Google provider uses backend checkpoints for progress updates.',
        } satisfies ProcessingDiagnostics,
      };
    }

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
      } else if (result.status?.status === 'CANCELLED') {
        await this.prisma.legalDocument.updateMany({
          where: {
            aiDocumentId: aiDocumentId,
            uploadedById: req.user.sub,
          },
          data: {
            status: 'DRAFT',
          },
        });
      }

      return {
        status: result.status,
        diagnostics: {
          statusSource: 'ai-service',
          ocrProvider,
          note: 'Status is coming directly from the AI service background worker.',
        } satisfies ProcessingDiagnostics,
      };
    } catch (error) {
      const fallback = await this.buildFallbackProcessingStatus(
        aiDocumentId,
        req.user.sub,
      );
      if (fallback) {
        return {
          status: fallback,
          diagnostics: {
            statusSource: 'backend-fallback',
            ocrProvider,
            note: 'AI service status was unavailable; using backend/local processing checkpoints.',
          } satisfies ProcessingDiagnostics,
        };
      }
      this.logger.warn('Error checking document status:', error);
      const defaultStatus = {
        status: {
          status: 'PROCESSING',
          details:
            'Processing is still ongoing in the background. Please wait a moment.',
          progress: 10,
          timestamp: new Date().toISOString(),
        },
      };

      return {
        ...defaultStatus,
        diagnostics: {
          statusSource: 'backend-fallback',
          ocrProvider,
          note: 'AI service status lookup failed and no local checkpoint was found.',
        } satisfies ProcessingDiagnostics,
      };
    }
  }

  @Post('search')
  @UseGuards(JwtAuthGuard)
  async searchDocuments(
    @Body() searchDto: { query: string; limit?: number },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const quotaSnapshot =
        await this.documentsService.enforceAiUsageWithinDailyLimits(
          req.user.sub,
        );
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
        quota: {
          userRemainingToday: quotaSnapshot.userRemainingToday,
          practiceRemainingToday: quotaSnapshot.practiceRemainingToday,
          usageDate: quotaSnapshot.usageDate,
          plan: quotaSnapshot.planLabel,
        },
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
      const quotaSnapshot =
        await this.documentsService.enforceAiUsageWithinDailyLimits(
          req.user.sub,
        );

      if (this.getAiProvider() === 'google') {
        const googleResult = await this.queryDocumentsWithGoogle(
          queryDto.query,
          req.user.sub,
          queryDto.limit ?? 10,
          queryDto.caseId,
          queryDto.documentId,
        );
        return {
          ...googleResult,
          quota: {
            userRemainingToday: quotaSnapshot.userRemainingToday,
            practiceRemainingToday: quotaSnapshot.practiceRemainingToday,
            usageDate: quotaSnapshot.usageDate,
            plan: quotaSnapshot.planLabel,
          },
        };
      }

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
      const directResult = await this.queryDocumentsDirect(
        query,
        req.user.sub,
        limit,
        context,
        finalHistory, // Use validated history that's guaranteed to fit within token limits
      );
      return {
        ...directResult,
        quota: {
          userRemainingToday: quotaSnapshot.userRemainingToday,
          practiceRemainingToday: quotaSnapshot.practiceRemainingToday,
          usageDate: quotaSnapshot.usageDate,
          plan: quotaSnapshot.planLabel,
        },
      };
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
    let searchResults: Awaited<ReturnType<QdrantService['searchDocuments']>> =
      [];
    try {
      // First, search Qdrant for relevant documents
      searchResults = await this.qdrantService.searchDocuments(
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
        formattedSources, // sources
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

      // If generation service fails, return a graceful fallback built from
      // already-retrieved sources so the assistant does not hard-fail.
      if (searchResults && searchResults.length > 0) {
        const formattedSources =
          await this.documentsService.enrichVectorSearchHits(
            searchResults,
            userId,
          );

        const fallbackSnippets = formattedSources
          .slice(0, 3)
          .map((source, index) => {
            const snippet = (source.content || '').replace(/\s+/g, ' ').trim();
            return `Source ${index + 1}: ${snippet.slice(0, 280)}${snippet.length > 280 ? '...' : ''}`;
          })
          .join('\n\n');

        return {
          question: query,
          answer:
            'I am having trouble reaching the AI generation service right now. I found relevant document excerpts below while this is being resolved.\n\n' +
            fallbackSnippets +
            '\n\nPlease retry in a moment for a full AI-generated answer.',
          sources: formattedSources,
          confidence: 0.25,
          generated_at: new Date().toISOString(),
        };
      }

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

    const normalizedQueries = await Promise.all(
      queries.map(async (query) => {
        const rawSources = Array.isArray(query.sources) ? query.sources : [];
        if (!rawSources.length) {
          return query;
        }

        const sourceCandidates = rawSources.filter(
          (
            s,
          ): s is {
            document_id: string;
            content: string;
            score: number;
            page_number?: number;
            start_char?: number;
            end_char?: number;
          } => {
            const candidate = s as Record<string, unknown> | null;
            return (
              candidate != null &&
              typeof candidate.document_id === 'string' &&
              typeof candidate.content === 'string' &&
              typeof candidate.score === 'number'
            );
          },
        );

        if (!sourceCandidates.length) {
          return { ...query, sources: [] };
        }

        const normalizedSources =
          await this.documentsService.enrichVectorSearchHits(
            sourceCandidates,
            req.user.sub,
          );

        return {
          ...query,
          sources: normalizedSources,
        };
      }),
    );

    return normalizedQueries;
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
      return {
        message: 'Document is already processed',
        document,
      };
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
      await this.prisma.legalDocument.update({
        where: { id: document.id },
        data: {
          status: 'PROCESSING',
          aiDocumentId: newAiDocumentId,
        },
      });

      void this.processDocumentInBackground({
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
      if (document.aiDocumentId?.startsWith('files/')) {
        try {
          await this.deleteGoogleFile(document.aiDocumentId);
        } catch (googleDeleteError) {
          this.logger.warn(
            `Failed to delete Google file ${document.aiDocumentId}: ${
              googleDeleteError instanceof Error
                ? googleDeleteError.message
                : String(googleDeleteError)
            }`,
          );
        }
      }

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

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof ForbiddenException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && error.message?.includes('not found')) {
        throw new NotFoundException('Document not found');
      }

      if (error instanceof Error && error.message?.includes('Access denied')) {
        throw new ForbiddenException('Access denied to this document');
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

  private getOcrProvider(): 'current' | 'google' {
    const provider = this.configService.get<string>('OCR_PROVIDER');
    if ((provider || '').toLowerCase() === 'google') {
      return 'google';
    }
    return 'current';
  }

  private getGoogleOcrMaxInlineBytes(): number {
    const raw = this.configService.get<string>('GOOGLE_OCR_MAX_INLINE_BYTES');
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    const maxDocumentSize = Number(
      this.configService.get<string>('MAX_DOCUMENT_SIZE') || 20 * 1024 * 1024,
    );
    if (Number.isFinite(maxDocumentSize) && maxDocumentSize > 0) {
      return Math.floor(maxDocumentSize);
    }
    return 20 * 1024 * 1024;
  }

  private getGoogleOcrTimeoutMs(): number {
    const raw = this.configService.get<string>('GOOGLE_OCR_TIMEOUT_MS');
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    return 120_000;
  }

  private supportsGoogleOcrMime(mimeType: string): boolean {
    const supported = new Set<string>([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
    ]);
    return supported.has(mimeType);
  }

  private replaceFileExtension(fileName: string, newExtension: string): string {
    const idx = fileName.lastIndexOf('.');
    if (idx <= 0) {
      return `${fileName}${newExtension}`;
    }
    return `${fileName.slice(0, idx)}${newExtension}`;
  }

  private buildGoogleOcrIngestionText(
    fullText: string,
    pageTexts?: string[],
  ): string {
    const normalizedPages = (pageTexts || [])
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p.length > 0);

    if (!normalizedPages.length) {
      return fullText;
    }

    return normalizedPages
      .map((pageText, index) => `[[PAGE_${index + 1}]]\n${pageText}`)
      .join('\n\n');
  }

  private async prepareIngestionPayload(params: {
    aiDocumentId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalFilename: string;
    userId?: string;
  }): Promise<{
    fileBuffer: Buffer;
    mimeType: string;
    originalFilename: string;
  }> {
    const { aiDocumentId, fileBuffer, mimeType, originalFilename } = params;
    const ocrProvider = this.getOcrProvider();

    if (ocrProvider !== 'google') {
      this.setLocalProcessingStatus(
        aiDocumentId,
        {
          status: 'PROCESSING',
          details:
            'Upload complete. Processing/training started in background.',
          progress: 0,
        },
        params.userId,
      );
      return { fileBuffer, mimeType, originalFilename };
    }

    if (!this.googleOcrService.isConfigured()) {
      throw new Error(
        'Google OCR is required but not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY and retry.',
      );
    }

    if (!this.supportsGoogleOcrMime(mimeType)) {
      throw new Error(
        `Google OCR does not support this file type (${mimeType}). Please upload a PDF or image file.`,
      );
    }

    const maxInlineBytes = this.getGoogleOcrMaxInlineBytes();
    if (fileBuffer.length > maxInlineBytes) {
      throw new Error(
        `File size exceeds Google OCR inline limit (${Math.round(maxInlineBytes / 1024 / 1024)}MB). Please upload a smaller file.`,
      );
    }

    try {
      this.setLocalProcessingStatus(
        aiDocumentId,
        {
          status: 'PROCESSING',
          details: 'Google OCR is reading your document...',
          progress: 10,
        },
        params.userId,
      );

      const extraction = await this.googleOcrService.extractTextFromPdf({
        fileBuffer,
        fileName: originalFilename,
        mimeType,
        timeoutMs: this.getGoogleOcrTimeoutMs(),
      });

      if (!extraction.text?.trim()) {
        throw new Error(
          'Google OCR did not return readable text for this file. Please retry or upload a clearer document.',
        );
      }

      const textForIngestion = this.buildGoogleOcrIngestionText(
        extraction.text,
        extraction.pageTexts,
      );
      const textBuffer = Buffer.from(textForIngestion, 'utf8');
      this.logger.log(
        `Google OCR succeeded (${textBuffer.length} bytes text). Sending extracted text to ingestion.`,
      );
      this.setLocalProcessingStatus(
        aiDocumentId,
        {
          status: 'PROCESSING',
          details: 'Google OCR completed. Starting embeddings and indexing...',
          progress: 55,
        },
        params.userId,
      );

      return {
        fileBuffer: textBuffer,
        mimeType: 'text/plain',
        originalFilename: this.replaceFileExtension(originalFilename, '.txt'),
      };
    } catch (error) {
      this.logger.warn(
        'Google OCR failed.',
        error instanceof Error ? error.message : error,
      );
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Google OCR failed. Please retry later.',
      );
    }
  }

  private async processDocumentInBackground(params: {
    legalDocumentId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalFilename: string;
    userId: string;
    aiDocumentId: string;
    description?: string;
  }): Promise<void> {
    try {
      this.setLocalProcessingStatus(
        params.aiDocumentId,
        {
          status: 'PROCESSING',
          details:
            'Upload complete. Processing/training started in background.',
          progress: 0,
        },
        params.userId,
      );

      if (this.getAiProvider() === 'google') {
        await this.ingestWithGoogleAndUpdateLegalDocument(params);
        return;
      }

      const ingestionPayload = await this.prepareIngestionPayload({
        aiDocumentId: params.aiDocumentId,
        fileBuffer: params.fileBuffer,
        mimeType: params.mimeType,
        originalFilename: params.originalFilename,
        userId: params.userId,
      });

      this.setLocalProcessingStatus(
        params.aiDocumentId,
        {
          status: 'PROCESSING',
          details: 'Uploading processed content for embeddings...',
          progress: 70,
        },
        params.userId,
      );

      await this.ingestWithAiAndUpdateLegalDocument({
        legalDocumentId: params.legalDocumentId,
        fileBuffer: ingestionPayload.fileBuffer,
        mimeType: ingestionPayload.mimeType,
        originalFilename: ingestionPayload.originalFilename,
        userId: params.userId,
        aiDocumentId: params.aiDocumentId,
        description: params.description,
      });
    } catch (error) {
      this.setLocalProcessingStatus(
        params.aiDocumentId,
        {
          status: 'ERROR',
          details: 'Background processing failed.',
          error: error instanceof Error ? error.message : String(error),
          progress: 0,
        },
        params.userId,
      );
      this.logger.error(
        'Background document processing failed (upload already saved):',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async ingestWithGoogleAndUpdateLegalDocument(params: {
    legalDocumentId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalFilename: string;
    userId: string;
    aiDocumentId: string;
    description?: string;
  }): Promise<void> {
    // For Google provider mode, always run OCR pre-processing decision here.
    // If OCR_PROVIDER=google, this executes strict Google OCR without fallback.
    // If OCR_PROVIDER=current, this passes through unchanged.
    this.setLocalProcessingStatus(
      params.aiDocumentId,
      {
        status: 'PROCESSING',
        details: 'Preparing document text for indexing...',
        progress: 40,
      },
      params.userId,
    );
    const ingestionPayload = await this.prepareIngestionPayload({
      aiDocumentId: params.aiDocumentId,
      fileBuffer: params.fileBuffer,
      mimeType: params.mimeType,
      originalFilename: params.originalFilename,
      userId: params.userId,
    });

    this.setLocalProcessingStatus(
      params.aiDocumentId,
      {
        status: 'PROCESSING',
        details: 'Building searchable chunk embeddings for fast retrieval...',
        progress: 80,
      },
      params.userId,
    );

    const ingestionResult = await this.ingestWithAiAndUpdateLegalDocument({
      legalDocumentId: params.legalDocumentId,
      fileBuffer: ingestionPayload.fileBuffer,
      mimeType: ingestionPayload.mimeType,
      originalFilename: ingestionPayload.originalFilename,
      userId: params.userId,
      aiDocumentId: params.aiDocumentId,
      description: params.description,
    });

    if (ingestionResult.isBackground) {
      this.setLocalProcessingStatus(
        params.aiDocumentId,
        {
          status: 'PROCESSING',
          details: 'Embedding/indexing is running in the background...',
          progress: 90,
        },
        params.userId,
      );
      return;
    }

    this.setLocalProcessingStatus(
      params.aiDocumentId,
      {
        status: 'COMPLETED',
        details:
          'Embeddings indexed. Google answering will use retrieved chunks for low-cost, high-scale queries.',
        progress: 100,
      },
      params.userId,
    );
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
  }): Promise<{ isBackground: boolean }> {
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
        signal: AbortSignal.timeout(30_000),
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

      this.setLocalProcessingStatus(
        aiDocumentId,
        {
          status: 'PROCESSING',
          details: 'Embedding and indexing in progress...',
          progress: 85,
        },
        userId,
      );

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

      void this.watchBackgroundProcessing({
        legalDocumentId,
        aiServiceDocumentId: documentInfo.document_id,
        streamAiDocumentId: aiDocumentId,
        userId,
      });

      this.logger.log(
        'Document uploaded successfully, processing in background:',
        {
          documentId: legalDocumentId,
          aiDocumentId: documentInfo.document_id,
        },
      );
      return { isBackground: true };
    } else {
      const documentInfo = result.documents[0];

      this.setLocalProcessingStatus(
        aiDocumentId,
        {
          status: 'COMPLETED',
          details: 'Processing completed successfully.',
          progress: 100,
        },
        userId,
      );

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
      return { isBackground: false };
    }
  }

  private async watchBackgroundProcessing(params: {
    legalDocumentId: string;
    aiServiceDocumentId: string;
    streamAiDocumentId: string;
    userId: string;
  }): Promise<void> {
    const { legalDocumentId, aiServiceDocumentId, streamAiDocumentId, userId } =
      params;

    const attempts = 180; // ~15 minutes @ 5s
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(
          `${this.configService.get('AI_SERVICE_URL')}/api/v1/admin/documents/status/${aiServiceDocumentId}`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': this.configService.get('AI_SERVICE_API_KEY'),
            },
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!response.ok) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const result = (await response.json()) as {
          status?: {
            status?: string;
            details?: string;
            error?: string;
            progress?: number;
          };
        };
        const s = result.status;
        if (!s?.status) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        if (typeof s.progress === 'number') {
          this.setLocalProcessingStatus(
            streamAiDocumentId,
            {
              status: 'PROCESSING',
              details: s.details || 'Background processing is running...',
              progress: s.progress,
            },
            userId,
          );
        }

        if (s.status === 'COMPLETED') {
          await this.prisma.legalDocument.update({
            where: { id: legalDocumentId },
            data: { status: 'PROCESSED' },
          });
          this.setLocalProcessingStatus(
            streamAiDocumentId,
            {
              status: 'COMPLETED',
              details: 'Document processing completed.',
              progress: 100,
            },
            userId,
          );
          return;
        }

        if (s.status === 'ERROR') {
          this.setLocalProcessingStatus(
            streamAiDocumentId,
            {
              status: 'ERROR',
              details: s.details || 'Background processing failed.',
              error: s.error || 'Processing failed',
              progress: typeof s.progress === 'number' ? s.progress : 0,
            },
            userId,
          );
          return;
        }

        if (s.status === 'CANCELLED') {
          await this.prisma.legalDocument.update({
            where: { id: legalDocumentId },
            data: { status: 'DRAFT' },
          });
          this.setLocalProcessingStatus(
            streamAiDocumentId,
            {
              status: 'CANCELLED',
              details: s.details || 'Background processing was cancelled.',
              progress: typeof s.progress === 'number' ? s.progress : 0,
            },
            userId,
          );
          return;
        }
      } catch {
        // continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    this.setLocalProcessingStatus(
      streamAiDocumentId,
      {
        status: 'PROCESSING',
        details:
          'Still processing in background. You can refresh later to see final state.',
        progress: 95,
      },
      userId,
    );
  }

  private async uploadFileToGoogle(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<GoogleFileRecord> {
    const apiKey = this.getGoogleApiKey();
    if (!apiKey) {
      throw new Error(
        'Google API key is missing for DOCUMENT_AI_PROVIDER=google',
      );
    }

    const displayName = fileName.slice(0, 120);
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(fileBuffer.length),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: { display_name: displayName },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!startRes.ok) {
      throw new Error(
        `Google upload start failed with status ${startRes.status}: ${await startRes.text()}`,
      );
    }

    const uploadUrl = startRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('Google upload URL was not returned');
    }

    const finalizeRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
        'Content-Length': String(fileBuffer.length),
      },
      body: new Uint8Array(fileBuffer),
      signal: AbortSignal.timeout(90_000),
    });

    const finalizeBody = (await finalizeRes.json().catch(() => null)) as {
      file?: {
        name?: string;
        uri?: string;
        mimeType?: string;
      };
    } | null;

    if (!finalizeRes.ok || !finalizeBody?.file?.name) {
      throw new Error(
        `Google upload finalize failed with status ${finalizeRes.status}`,
      );
    }

    return this.waitForGoogleFileReady(finalizeBody.file.name);
  }

  private async waitForGoogleFileReady(
    fileName: string,
  ): Promise<GoogleFileRecord> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const metadata = await this.getGoogleFileMetadata(fileName);
      if (
        metadata.state === 'ACTIVE' &&
        typeof metadata.uri === 'string' &&
        metadata.uri.length > 0
      ) {
        return {
          name: metadata.name,
          uri: metadata.uri,
          mimeType: metadata.mimeType || 'application/octet-stream',
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error('Google file did not become ACTIVE within timeout');
  }

  private async getGoogleFileMetadata(fileName: string): Promise<{
    name: string;
    uri?: string;
    mimeType?: string;
    state?: string;
  }> {
    const apiKey = this.getGoogleApiKey();
    if (!apiKey) {
      throw new Error('Google API key missing');
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(20_000),
      },
    );

    const body = (await res.json().catch(() => null)) as {
      name?: string;
      uri?: string;
      mimeType?: string;
      state?: string;
    } | null;

    if (!res.ok || !body?.name) {
      throw new Error(`Failed to fetch Google file metadata (${res.status})`);
    }

    return {
      name: body.name,
      uri: body.uri,
      mimeType: body.mimeType,
      state: body.state,
    };
  }

  private async repairGoogleFileBinding(doc: GoogleBackedDocument): Promise<{
    docId: string;
    title: string;
    uri: string;
    mimeType: string;
  } | null> {
    if (!doc.fileUrl) return null;

    const fileBuffer = await this.s3Service.getDocumentAsBuffer(doc.fileUrl);
    if (!fileBuffer.length) return null;

    const resolvedName =
      doc.originalFilename ||
      `${doc.title || 'document'}${this.inferExtensionFromMime(doc.fileType)}`;

    const uploaded = await this.uploadFileToGoogle(
      fileBuffer,
      doc.fileType || 'application/octet-stream',
      resolvedName,
    );

    await this.prisma.legalDocument.update({
      where: { id: doc.id },
      data: {
        aiDocumentId: uploaded.name,
        status: 'PROCESSED',
      },
    });

    return {
      docId: doc.id,
      title: doc.title || 'Document',
      uri: uploaded.uri,
      mimeType: uploaded.mimeType || 'application/octet-stream',
    };
  }

  private async deleteGoogleFile(fileName: string): Promise<void> {
    const apiKey = this.getGoogleApiKey();
    if (!apiKey) return;
    if (!fileName.startsWith('files/')) return;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!res.ok && res.status !== 404) {
      throw new Error(`Google file delete failed (${res.status})`);
    }
  }

  private async queryDocumentsWithGoogle(
    query: string,
    userId: string,
    _limit: number,
    selectedCaseId?: string,
    selectedDocumentId?: string,
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
    const apiKey = this.getGoogleApiKey();
    if (!apiKey) {
      throw new BadRequestException(
        'Google API key missing for DOCUMENT_AI_PROVIDER=google',
      );
    }

    const userDocs = await this.prisma.legalDocument.findMany({
      where: {
        uploadedById: userId,
        status: 'PROCESSED',
        aiDocumentId: { not: null },
      },
      select: {
        id: true,
        aiDocumentId: true,
        title: true,
        originalFilename: true,
        caseId: true,
        case: {
          select: {
            title: true,
            caseNumber: true,
          },
        },
      },
    });

    const caseMap = new Map<
      string,
      {
        caseId: string;
        caseTitle: string;
        caseNumber: string | null;
        docIds: string[];
        docCount: number;
      }
    >();

    for (const row of userDocs) {
      const cid = row.caseId;
      if (!cid) continue; // We use case entities for disambiguation UX.
      const existing = caseMap.get(cid);
      if (existing) {
        existing.docIds.push(row.id);
        existing.docCount += 1;
        continue;
      }
      caseMap.set(cid, {
        caseId: cid,
        caseTitle: row.case?.title || 'Untitled case',
        caseNumber: row.case?.caseNumber || null,
        docIds: [row.id],
        docCount: 1,
      });
    }

    const caseOptions = Array.from(caseMap.values()).sort((a, b) =>
      a.caseTitle.localeCompare(b.caseTitle),
    );

    let effectiveCaseId = selectedCaseId;
    const effectiveDocumentId = selectedDocumentId;
    if (effectiveDocumentId) {
      const explicitDoc = userDocs.find((d) => d.id === effectiveDocumentId);
      if (!explicitDoc) {
        return {
          question: query,
          answer:
            'The selected document is not available for this account. Please reselect the document and try again.',
          sources: [],
          confidence: 0.1,
          generated_at: new Date().toISOString(),
        };
      }
      if (explicitDoc.caseId) {
        effectiveCaseId = explicitDoc.caseId;
      }
    }

    if (!effectiveCaseId) {
      const terms = this.extractIntentTerms(query);
      const ranked = caseOptions
        .map((opt) => {
          const caseText = `${opt.caseTitle} ${opt.caseNumber || ''}`;
          const linkedDocs = userDocs.filter((d) => d.caseId === opt.caseId);
          const docText = linkedDocs
            .map((d) => `${d.title || ''} ${d.originalFilename || ''}`)
            .join(' ');
          const score =
            this.scoreQueryAgainstText(terms, caseText) * 2 +
            this.scoreQueryAgainstText(terms, docText);
          return { opt, score };
        })
        .sort((a, b) => b.score - a.score);

      if (ranked.length > 0 && ranked[0].score > 0) {
        const top = ranked[0];
        const second = ranked[1];
        // Auto-select only when confidence is clear to avoid silent wrong-case answers.
        if (!second || top.score >= second.score + 2) {
          effectiveCaseId = top.opt.caseId;
        }
      }

      // Fallback exact includes match from prior helper.
      if (!effectiveCaseId) {
        effectiveCaseId =
          this.inferCaseFromQuery(query, caseOptions) || undefined;
      }
    }

    const intent =
      (await this.classifyIntentWithGoogle(query, apiKey)) ||
      this.detectGoogleQueryIntent(query);
    const asksForCaseContext =
      /\b(about|regarding|re|tell me about|brief|summary|status|background)\b/i.test(
        query,
      ) ||
      intent === 'case_brief' ||
      intent === 'summary';

    if (
      !effectiveDocumentId &&
      !effectiveCaseId &&
      caseOptions.length > 1 &&
      asksForCaseContext
    ) {
      const list = caseOptions
        .slice(0, 8)
        .map(
          (c, idx) =>
            `${idx + 1}. ${c.caseTitle}${c.caseNumber ? ` (${c.caseNumber})` : ''} - ${c.docCount} document${c.docCount > 1 ? 's' : ''}`,
        )
        .join('\n');
      return {
        question: query,
        answer:
          'I found multiple cases in your workspace and this question could apply to more than one.\n\n' +
          'Please tell me which case you mean (name or case number):\n' +
          `${list}\n\n` +
          'After you pick one, I will answer from that case documents only.',
        sources: [],
        confidence: 0.2,
        generated_at: new Date().toISOString(),
      };
    }

    const scopedDocIds = effectiveDocumentId
      ? userDocs
          .filter((d) => d.id === effectiveDocumentId)
          .flatMap((d) =>
            [d.id, d.aiDocumentId].filter((v): v is string => Boolean(v)),
          )
      : effectiveCaseId
        ? userDocs
            .filter((d) => d.caseId === effectiveCaseId)
            .flatMap((d) =>
              [d.id, d.aiDocumentId].filter((v): v is string => Boolean(v)),
            )
        : undefined;

    const searchResults = await this.qdrantService.searchDocuments(
      query,
      userId,
      Math.max(this.getGoogleQueryMaxChunks() * 2, 12),
      scopedDocIds,
    );
    if (!searchResults || searchResults.length === 0) {
      return {
        question: query,
        answer:
          'I could not find indexed document chunks for your account yet. Please upload and process a document first.',
        sources: [],
        confidence: 0.1,
        generated_at: new Date().toISOString(),
      };
    }

    const formattedSources = await this.documentsService.enrichVectorSearchHits(
      searchResults,
      userId,
    );
    const scopedSources = effectiveCaseId
      ? formattedSources.filter((source) => {
          const doc = userDocs.find((d) => d.id === source.document_id);
          return doc?.caseId === effectiveCaseId;
        })
      : formattedSources;

    const documentScopedSources = effectiveDocumentId
      ? scopedSources.filter(
          (source) => source.document_id === effectiveDocumentId,
        )
      : scopedSources;

    if (!documentScopedSources.length) {
      return {
        question: query,
        answer: effectiveDocumentId
          ? 'I could not find enough indexed snippets for the selected document. Please try rephrasing or choose another document.'
          : 'I could not find enough indexed snippets for the selected case. Please try rephrasing, or choose another case/document.',
        sources: [],
        confidence: 0.1,
        generated_at: new Date().toISOString(),
      };
    }

    const maxContextChars = this.getGoogleQueryMaxContextChars();
    let usedChars = 0;
    const selectedSources: typeof documentScopedSources = [];

    for (const source of documentScopedSources) {
      const normalized = (source.content || '').replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      const slice = normalized.slice(0, 1200);
      if (
        usedChars + slice.length > maxContextChars &&
        selectedSources.length
      ) {
        break;
      }
      selectedSources.push({ ...source, content: slice });
      usedChars += slice.length;
      if (usedChars >= maxContextChars) {
        break;
      }
    }

    const contextText = selectedSources
      .map(
        (source, index) =>
          `Source ${index + 1} [document_id=${source.document_id}]:\n${source.content}`,
      )
      .join('\n\n');

    const parts: Array<Record<string, unknown>> = [
      {
        text: this.buildGoogleInstructionByIntent(intent),
      },
      { text: `Question: ${query}` },
      { text: `Retrieved snippets:\n\n${contextText}` },
    ];

    const requestBody = JSON.stringify({
      contents: [{ role: 'user', parts }],
    });

    const candidateModels = this.getGoogleQueryCandidateModels();
    let status = 0;
    let payload: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    } | null = null;

    for (const model of candidateModels) {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
      const result = await this.callGoogleGenerateContent(
        endpoint,
        requestBody,
      );
      status = result.status;
      payload = result.payload;
      if (status === 200) {
        break;
      }
      if (this.shouldTryNextGoogleModel(status, payload)) {
        this.logger.warn(
          `Google query model ${model} unavailable. Trying next Google model.`,
        );
        continue;
      }
      break;
    }

    const sources = selectedSources.map((source) => ({
      document_id: source.document_id,
      content: source.content,
      score: source.score,
      page_number: source.page_number,
      start_char: source.start_char,
      end_char: source.end_char,
    }));

    if (status !== 200) {
      if (status === 429) {
        return {
          question: query,
          answer:
            'Google AI is currently rate-limited for this project (429 quota/throttle). Please retry later or rotate to a fresh API key/project quota.',
          sources,
          confidence: 0.15,
          generated_at: new Date().toISOString(),
        };
      }
      if (status === 404) {
        return {
          question: query,
          answer:
            'Google returned 404 for this query (model or file reference may be invalid for the current project/key). Please reprocess documents or update GOOGLE_QUERY_MODEL.',
          sources,
          confidence: 0.1,
          generated_at: new Date().toISOString(),
        };
      }
      throw new BadRequestException(
        `Google query failed (${status}). Please try again.`,
      );
    }

    const answer =
      payload?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('\n')
        .trim() || 'No answer generated by Google model.';

    await this.documentsService.logDocumentQuery(
      userId,
      query,
      answer,
      undefined,
      sources,
      undefined,
      undefined,
      QueryType.GENERAL,
    );

    return {
      question: query,
      answer,
      sources,
      confidence: 0.85,
      generated_at: new Date().toISOString(),
    };
  }

  private async callGoogleGenerateContent(
    endpoint: string,
    requestBody: string,
  ): Promise<{
    status: number;
    payload: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    } | null;
  }> {
    let status = 0;
    let payload: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    } | null = null;

    const retryDelaysMs = [1200, 2500, 5000];
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        signal: AbortSignal.timeout(90_000),
      });
      status = response.status;
      payload = (await response.json().catch(() => null)) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        error?: { message?: string };
      } | null;

      if (response.ok) {
        return { status, payload };
      }
      if (status !== 429 || attempt === retryDelaysMs.length) {
        return { status, payload };
      }

      const waitMs = retryDelaysMs[attempt];
      this.logger.warn(
        `Google query rate-limited (429). Retrying in ${waitMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return { status, payload };
  }

  private setLocalProcessingStatus(
    aiDocumentId: string,
    status: Omit<UiProcessingStatus, 'timestamp'>,
    userId?: string,
  ): void {
    const previousStatus = this.localProcessingStatus.get(aiDocumentId);
    const nextStatus: UiProcessingStatus = {
      ...status,
      timestamp: new Date().toISOString(),
    };

    const inFlightStates = new Set(['PROCESSING', 'PENDING']);
    const terminalStates = new Set([
      'COMPLETED',
      'ERROR',
      'NOT_FOUND',
      'CANCELLED',
    ]);

    // Keep terminal states sticky to avoid accidental regressions from late updates.
    if (
      previousStatus &&
      terminalStates.has(previousStatus.status) &&
      previousStatus.status !== nextStatus.status
    ) {
      return;
    }

    // Enforce monotonic progress while document is still in-flight.
    if (
      previousStatus &&
      inFlightStates.has(previousStatus.status) &&
      inFlightStates.has(nextStatus.status) &&
      typeof previousStatus.progress === 'number' &&
      typeof nextStatus.progress === 'number' &&
      nextStatus.progress < previousStatus.progress
    ) {
      nextStatus.progress = previousStatus.progress;
    }

    this.localProcessingStatus.set(aiDocumentId, nextStatus);

    if (userId) {
      this.notificationEmitter.emitDocumentStatusUpdate(
        userId,
        aiDocumentId,
        nextStatus,
        {
          statusSource: 'backend-fallback',
          ocrProvider: this.getOcrProvider(),
        },
      );
    }
  }

  private async buildFallbackProcessingStatus(
    aiDocumentId: string,
    userId: string,
  ): Promise<UiProcessingStatus | null> {
    const local = this.localProcessingStatus.get(aiDocumentId);
    if (local) {
      return local;
    }

    const doc = await this.prisma.legalDocument.findFirst({
      where: { aiDocumentId, uploadedById: userId },
      select: { status: true, updatedAt: true },
    });

    if (!doc) {
      return { status: 'NOT_FOUND', timestamp: new Date().toISOString() };
    }

    if (doc.status === 'PROCESSED') {
      return {
        status: 'COMPLETED',
        details: 'Document processing completed.',
        progress: 100,
        timestamp: doc.updatedAt.toISOString(),
      };
    }

    if (doc.status === 'PROCESSING') {
      return {
        status: 'PROCESSING',
        details: 'Background processing is running...',
        progress: 15,
        timestamp: doc.updatedAt.toISOString(),
      };
    }

    return {
      status: doc.status,
      timestamp: doc.updatedAt.toISOString(),
    };
  }
}
