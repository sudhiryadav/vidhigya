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
import { DocumentCategory, DocumentStatus } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QdrantService } from '../config/qdrant.service';
import { S3Service } from '../config/s3.config';
import { CreateDocumentDto, DocumentsService } from './documents.service';
import { QueryType } from './dto/create-document-query.dto';

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
}

// Define proper types for request objects
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    [key: string]: any;
  };
}

// Define proper types for body objects
interface UploadDocumentBody {
  title?: string;
  description?: string;
  category?: string;
  caseId?: string;
}

interface UploadVersionBody {
  changeReason?: string;
  description?: string;
  category?: string;
}

interface AIUploadResponse {
  documents: Array<{
    document_id: string;
    chunks: number;
    content: string;
  }>;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly qdrantService: QdrantService,
  ) {}

  @Post()
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    createDocumentDto.uploadedById = req.user.sub;
    return this.documentsService.create(createDocumentDto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // No disk storage, we'll handle the file in memory
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
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

    try {
      // Generate unique filename
      const fileName = this.s3Service.generateFileName(
        file.originalname,
        req.user.sub,
      );

      // Upload to S3
      const fileUrl = await this.s3Service.uploadDocument(
        file.buffer,
        fileName,
        file.mimetype,
      );

      // Create document record
      const createDocumentDto: CreateDocumentDto = {
        title: body.title || '',
        description: body.description || '',
        fileUrl: fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        category: (body.category as DocumentCategory) || DocumentCategory.OTHER,
        caseId: body.caseId || undefined,
        uploadedById: req.user.sub,
      };

      const document = await this.documentsService.create(createDocumentDto);

      // Send to AI service for Qdrant processing
      try {
        const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
        const aiServiceApiKey =
          this.configService.get<string>('AI_SERVICE_API_KEY');

        if (aiServiceUrl && aiServiceApiKey) {
          const formData = new FormData();
          formData.append(
            'files',
            new Blob([file.buffer], { type: file.mimetype }),
            file.originalname,
          );
          formData.append('userId', req.user.sub);
          formData.append('description', body.description || '');
          formData.append('category', body.category || '');

          const aiResponse = await fetch(
            `${aiServiceUrl}/api/v1/admin/documents/upload`,
            {
              method: 'POST',
              headers: {
                'X-API-Key': aiServiceApiKey,
              },
              body: formData,
            },
          );

          if (aiResponse.ok) {
            const aiResult = (await aiResponse.json()) as AIUploadResponse;

            // Update the document with AI service information
            if (aiResult.documents && aiResult.documents.length > 0) {
              const aiDocument = aiResult.documents[0];
              // Note: DocumentsService doesn't have an update method
              // The AI document ID and chunks are stored in the AI service
              console.log('AI service processed document:', {
                documentId: document.id,
                aiDocumentId: aiDocument.document_id,
                chunks: aiDocument.chunks,
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to send document to AI service:', error);
        // Don't fail the upload if AI service is unavailable
      }

      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new BadRequestException('Failed to upload document');
    }
  }

  @Post('query')
  @UseGuards(JwtAuthGuard)
  async queryDocuments(
    @Body() queryDto: QueryRequest,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const { query, mode = 'search', context, limit = 10 } = queryDto;

      console.log('Document query request:', {
        query,
        mode,
        context,
        limit,
        userId: req.user.sub,
      });

      if (!this.qdrantService) {
        throw new BadRequestException('Vector database not available');
      }

      if (mode === 'qa') {
        // Q&A mode - use Modal.com API for AI generation
        const modalServiceUrl = this.configService.get<string>(
          'MODAL_QUERY_DOCUMENTS_URL',
        );
        const modalApiKey = this.configService.get<string>(
          'MODAL_DOT_COM_X_API_KEY',
        );

        if (!modalServiceUrl || !modalApiKey) {
          throw new BadRequestException('Modal service not configured');
        }

        console.log('Calling Modal.com API for Q&A:', {
          url: modalServiceUrl,
          hasApiKey: !!modalApiKey,
        });

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': modalApiKey,
        };

        const requestBody = {
          query: query,
          user_id: req.user.sub,
          history: context ? [{ role: 'user', content: context }] : [],
        };

        const modalResponse = await fetch(modalServiceUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!modalResponse.ok) {
          const errorText = await modalResponse.text();
          console.error('Modal API error:', {
            status: modalResponse.status,
            statusText: modalResponse.statusText,
            errorText,
          });
          throw new BadRequestException(
            `Failed to generate AI answer: ${modalResponse.status} - ${errorText}`,
          );
        }

        // Modal returns streaming response, so we need to process it
        const reader = modalResponse.body?.getReader();
        if (!reader) {
          throw new BadRequestException('No response body from Modal API');
        }

        const decoder = new TextDecoder();
        let fullResponse = '';
        let sources: any[] = [];
        let isDone = false;

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
                  const data = JSON.parse(jsonStr);

                  if (data.response) {
                    fullResponse += data.response;
                  }
                  if (data.sources) {
                    sources = data.sources;
                  }
                  if (data.done) {
                    isDone = true;
                  }
                } catch (e) {
                  // Ignore JSON parsing errors for non-JSON lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        const result = {
          question: query,
          answer: fullResponse || 'No answer generated',
          sources: sources,
          confidence: 0.8, // Default confidence for Modal responses
          generated_at: new Date().toISOString(),
        };

        // Log the Q&A query
        await this.documentsService.logDocumentQuery(
          req.user.sub,
          query,
          fullResponse || 'No answer generated',
          undefined,
          sources,
          undefined,
          undefined,
          QueryType.GENERAL,
        );

        return result;
      } else {
        // Search mode
        const searchResults = await this.qdrantService.searchDocuments(
          query,
          req.user.sub,
          limit,
        );

        const result = {
          query,
          results: searchResults,
          total_results: searchResults.length,
          generated_at: new Date().toISOString(),
        };

        // Log the search query
        await this.documentsService.logDocumentQuery(
          req.user.sub,
          query,
          JSON.stringify(searchResults),
          undefined,
          searchResults,
          undefined,
          undefined,
          QueryType.DOCUMENT_ANALYSIS,
        );

        return result;
      }
    } catch (error) {
      console.error('Error processing document query:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process query');
    }
  }

  @Post(':id/upload-version')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
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
  async uploadNewVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadVersionBody,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Generate unique filename for new version
      const fileName = this.s3Service.generateFileName(
        file.originalname,
        req.user.sub,
      );

      // Upload to S3
      const fileUrl = await this.s3Service.uploadDocument(
        file.buffer,
        fileName,
        file.mimetype,
      );

      // Create new version
      const uploadDto: any = {
        // Assuming UploadNewVersionDto is removed, using 'any' for now
        fileUrl: fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        changeReason: body.changeReason,
        uploadedById: req.user.sub,
      };

      const document = await this.documentsService.uploadNewVersion(
        id,
        uploadDto,
      );

      // Send to AI service for Qdrant processing
      try {
        const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
        const aiServiceApiKey =
          this.configService.get<string>('AI_SERVICE_API_KEY');

        if (aiServiceUrl && aiServiceApiKey) {
          const formData = new FormData();
          formData.append(
            'files',
            new Blob([file.buffer], { type: file.mimetype }),
            file.originalname,
          );
          formData.append('userId', req.user.sub);
          formData.append('description', body.description || '');
          formData.append('category', body.category || '');

          const aiResponse = await fetch(
            `${aiServiceUrl}/api/v1/admin/documents/upload`,
            {
              method: 'POST',
              headers: {
                'X-API-Key': aiServiceApiKey,
              },
              body: formData,
            },
          );

          if (aiResponse.ok) {
            const aiResult = (await aiResponse.json()) as AIUploadResponse;

            // Update the document version with AI service information
            if (aiResult.documents && aiResult.documents.length > 0) {
              const aiDocument = aiResult.documents[0];
              // Update the latest version with AI document ID
              await this.documentsService.updateVersionAiDocumentId(
                id,
                document.version,
                aiDocument.document_id,
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to send document version to AI service:', error);
        // Don't fail the upload if AI service is unavailable
      }

      return document;
    } catch (error) {
      console.error('Error uploading new version:', error);
      throw new BadRequestException('Failed to upload new version');
    }
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query() query: DocumentQuery) {
    return this.documentsService.findAll(req.user.sub, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.documentsService.findOne(id, req.user.sub);
  }

  @Get(':id/versions')
  getVersionHistory(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.documentsService.getVersionHistory(id, req.user.sub);
  }

  @Get(':id/version/:version')
  getVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.documentsService.getVersion(
      id,
      parseInt(version),
      req.user.sub,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const document = await this.documentsService.findOne(id, req.user.sub);

    // Delete all versions from S3
    if (document.versions && document.versions.length > 0) {
      for (const version of document.versions) {
        try {
          await this.s3Service.deleteDocument(version.fileUrl);
        } catch (error) {
          console.error('Failed to delete version from S3:', error);
          // Continue with deletion even if S3 cleanup fails
        }
      }
    }

    return this.documentsService.remove(id, req.user.sub);
  }

  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      console.log(
        `Download request for document ID: ${id} by user: ${req.user.sub}`,
      );

      const document = await this.documentsService.findOne(id, req.user.sub);
      console.log('Document found:', {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        hasVersions: document.versions?.length > 0,
        latestVersion: document.versions?.[0]?.fileUrl,
      });

      // Check if document has a fileUrl or if we need to use the latest version
      let fileUrl = document.fileUrl;
      if (!fileUrl && document.versions && document.versions.length > 0) {
        fileUrl = document.versions[0].fileUrl;
        console.log(`Using latest version fileUrl: ${fileUrl}`);
      }

      if (!fileUrl) {
        console.error(`No fileUrl found for document ${id}`);
        throw new BadRequestException(
          'File not found - document has no associated file',
        );
      }

      console.log(`Generating signed URL for S3 key: ${fileUrl}`);

      // Generate signed URL for private S3 access
      const signedUrl = await this.s3Service.getDocumentSignedUrl(
        fileUrl,
        3600,
      ); // 1 hour expiry

      console.log(
        `Generated signed URL successfully, redirecting to: ${signedUrl.substring(0, 100)}...`,
      );

      return res.redirect(signedUrl);
    } catch (error) {
      console.error('Error in downloadDocument:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.message?.includes('not found')) {
        throw new BadRequestException('Document not found');
      }

      if (error.message?.includes('Access denied')) {
        throw new BadRequestException('Access denied to this document');
      }

      throw new BadRequestException('Error accessing document');
    }
  }

  @Get(':id/version/:version/download')
  async downloadVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const versionRecord = await this.documentsService.getVersion(
      id,
      parseInt(version),
      req.user.sub,
    );

    if (!versionRecord.fileUrl) {
      throw new BadRequestException('File not found');
    }

    try {
      // Generate signed URL for private S3 access
      const signedUrl = await this.s3Service.getDocumentSignedUrl(
        versionRecord.fileUrl,
        3600,
      ); // 1 hour expiry
      return res.redirect(signedUrl);
    } catch (error) {
      console.error('Error generating signed URL for document version:', error);
      throw new BadRequestException('Error accessing document version');
    }
  }
}
