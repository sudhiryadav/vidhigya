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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIService } from '../config/ai.service';
import { QdrantService } from '../config/qdrant.service';
import { S3Service } from '../config/s3.config';
import { PrismaService } from '../prisma/prisma.service';
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
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
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
      storage: memoryStorage(), // Use memory storage to get file.buffer
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
        originalFilename: file.originalname,
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

          // Ensure file buffer is not empty
          if (!file.buffer || file.buffer.length === 0) {
            console.error('File buffer is empty:', {
              originalname: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              bufferLength: file.buffer?.length,
            });
            throw new BadRequestException('File content is empty');
          }

          console.log('Sending file to AI service:', {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            bufferLength: file.buffer.length,
          });

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

              // Update the document with AI service information
              await this.prisma.legalDocument.update({
                where: { id: document.id },
                data: {
                  aiDocumentId: aiDocument.document_id,
                  aiChunks: aiDocument.chunks,
                  content: aiDocument.content,
                },
              });

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
        // AI Assistant mode - use Mistral 7B for sophisticated AI responses
        console.log('Using Mistral 7B for AI Assistant mode');

        try {
          // Use the AIService to generate sophisticated AI responses
          const aiResponse = await this.aiService.generateAIResponse(
            query,
            req.user.sub,
            context,
          );

          // Map filenames to actual document IDs
          const documentMap = new Map();
          const documents = await this.prisma.legalDocument.findMany({
            where: { uploadedById: req.user.sub },
            select: { id: true, originalFilename: true, title: true },
          });

          documents.forEach((doc) => {
            if (doc.originalFilename) {
              documentMap.set(doc.originalFilename, {
                id: doc.id,
                title: (doc.title || doc.originalFilename) as string,
              });
            }
          });

          const result = {
            question: query,
            answer: aiResponse.response,
            sources: aiResponse.sources.map((source) => {
              const filename = source.document || 'Unknown Document';
              const documentInfo = documentMap.get(filename) as
                | { id: string; title: string }
                | undefined;

              return {
                document_id: documentInfo?.id || 'unknown',
                document_title: documentInfo?.title || filename,
                content: filename,
                score: source.similarity,
                page_number: undefined,
                start_char: undefined,
                end_char: undefined,
              };
            }),
            confidence: 0.8, // High confidence for AI-generated responses
            generated_at: new Date().toISOString(),
          };

          // Log the AI query
          await this.documentsService.logDocumentQuery(
            req.user.sub,
            query,
            aiResponse.response,
            undefined,
            aiResponse.sources,
            undefined,
            undefined,
            QueryType.GENERAL,
          );

          return result;
        } catch (error) {
          console.error('AI Service error:', error);

          // Fallback to fast Qdrant-based response if AI service fails
          console.log('Falling back to Qdrant-based response');

          const searchResults = await this.qdrantService.searchDocuments(
            query,
            req.user.sub,
            limit,
          );

          if (!searchResults || searchResults.length === 0) {
            const result = {
              question: query,
              answer:
                'I could not find any relevant information. Please try rephrasing your question or make sure you have uploaded the relevant documents.',
              sources: [],
              confidence: 0.0,
              generated_at: new Date().toISOString(),
            };

            // Log the Q&A query
            await this.documentsService.logDocumentQuery(
              req.user.sub,
              query,
              result.answer,
              undefined,
              [],
              undefined,
              undefined,
              QueryType.GENERAL,
            );

            return result;
          }

          // Generate a comprehensive answer based on the search results
          let answer = `Based on your documents, here's what I found about "${query}":\n\n`;

          // Add the most relevant information from the top results
          const topResults = searchResults.slice(0, 3);
          for (let i = 0; i < topResults.length; i++) {
            const result = topResults[i];
            answer += `${i + 1}. ${result.content.substring(0, 300)}${
              result.content.length > 300 ? '...' : ''
            }\n\n`;
          }

          answer += `\nThis answer is based on ${searchResults.length} relevant document sections from your uploaded files.`;

          const fallbackResult = {
            question: query,
            answer: answer,
            sources: searchResults.map((result) => ({
              document_id: result.document_id,
              content: result.content,
              score: result.score,
              page_number: result.page_number,
              start_char: result.start_char,
              end_char: result.end_char,
            })),
            confidence: Math.min(
              0.9,
              Math.max(0.3, searchResults[0]?.score || 0.3),
            ),
            generated_at: new Date().toISOString(),
          };

          // Log the Q&A query
          await this.documentsService.logDocumentQuery(
            req.user.sub,
            query,
            answer,
            undefined,
            searchResults,
            undefined,
            undefined,
            QueryType.GENERAL,
          );

          return fallbackResult;
        }
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

  @Get()
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
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    return queries;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.documentsService.findOne(id, req.user.sub);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    console.log(
      `Starting document deletion for ID: ${id} by user: ${req.user.sub}`,
    );

    const document = await this.documentsService.findOne(id, req.user.sub);
    console.log('Document found for deletion:', {
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
    });

    try {
      // First, delete from database and Qdrant (this is the critical operation)
      console.log(
        'Calling documentsService.remove to delete from DB and Qdrant...',
      );
      const deletedDocument = await this.documentsService.remove(
        id,
        req.user.sub,
      );
      console.log('Successfully deleted from database and Qdrant');

      // Then, clean up S3 files (this is less critical, can fail without breaking the operation)
      console.log('Starting S3 cleanup...');

      // Delete main document file from S3
      if (document.fileUrl) {
        try {
          console.log(`Deleting main document from S3: ${document.fileUrl}`);
          await this.s3Service.deleteDocument(document.fileUrl);
          console.log('Main document deleted from S3 successfully');
        } catch (error) {
          console.error('Failed to delete main document from S3:', error);
          // Continue with deletion even if S3 cleanup fails
        }
      }

      console.log('Document deletion completed successfully');
      return deletedDocument;
    } catch (error) {
      console.error('Error during document deletion:', error);
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
      console.log(
        `Download request for document ID: ${id} by user: ${req.user.sub}`,
      );

      const document = await this.documentsService.findOne(id, req.user.sub);
      console.log('Document found:', {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
      });

      const fileUrl = document.fileUrl;

      if (!fileUrl) {
        console.error(`No fileUrl found for document ${id}`);
        throw new BadRequestException(
          'File not found - document has no associated file',
        );
      }

      console.log(`Fetching file from S3: ${fileUrl}`);

      // Get the file buffer from S3
      console.log(`About to fetch file from S3 with key: ${fileUrl}`);
      const fileBuffer = await this.s3Service.getDocumentAsBuffer(fileUrl);
      console.log(`File buffer received, size: ${fileBuffer.length} bytes`);

      // Check if the file is empty
      if (fileBuffer.length === 0) {
        console.error(`File is empty: ${fileUrl}`);
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
      const originalFilename = document.originalFilename as string | null;
      const filename =
        originalFilename || `${document.title || 'document'}.${fileExtension}`;

      console.log('Download filename details:', {
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

      console.log(
        `Sending file with content type: ${contentType}, size: ${fileBuffer.length} bytes`,
      );

      return res.send(fileBuffer);
    } catch (error) {
      console.error('Error in downloadDocument:', error);

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
}
