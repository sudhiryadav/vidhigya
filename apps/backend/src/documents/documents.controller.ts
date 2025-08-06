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
import { DocumentProcessorService } from '../config/document-processor.service';
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

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly qdrantService: QdrantService,
    private readonly documentProcessorService: DocumentProcessorService,
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

  private getMaxDocumentSize(): number {
    return parseInt(
      this.configService.get<string>('MAX_DOCUMENT_SIZE') || '20971520',
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Use memory storage to get file.buffer
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
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

    // Validate file size
    const maxSize = this.getMaxDocumentSize();
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes (${Math.round(maxSize / 1024 / 1024)}MB)`,
      );
    }

    let uploadedFileUrl: string | null = null;
    let createdDocument: any = null;

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

      console.log('File uploaded to S3:', {
        fileName,
        fileUrl: uploadedFileUrl,
        size: file.size,
      });

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
      };

      createdDocument = await this.documentsService.create(createDocumentDto);

      console.log('Document record created:', {
        documentId: createdDocument.id,
        title: createdDocument.title,
      });

      // Process document locally using NestJS
      try {
        const processedDocument =
          await this.documentProcessorService.processDocument(
            file.buffer,
            file.originalname,
            req.user.sub,
          );

        console.log('Document processed:', {
          documentId: processedDocument.document_id,
          chunks: processedDocument.chunks.length,
          contentLength: processedDocument.content.length,
        });

        // Store chunks in Qdrant directly
        if (this.qdrantService && processedDocument.chunks.length > 0) {
          const qdrantSuccess = await this.qdrantService.storeDocumentChunks(
            createdDocument.id, // Use the database document ID instead of generated UUID
            req.user.sub,
            processedDocument.chunks,
            processedDocument.filename,
            processedDocument.file_type,
          );

          if (!qdrantSuccess) {
            console.error('Failed to store document chunks in Qdrant');
            // Continue anyway, but log the failure
          }
        }

        // Update the document with processing information
        await this.prisma.legalDocument.update({
          where: { id: createdDocument.id },
          data: {
            aiDocumentId: createdDocument.id, // Use the database document ID
            aiChunks: processedDocument.chunks.length,
            content: processedDocument.content,
          },
        });

        console.log('Document processing completed successfully:', {
          documentId: createdDocument.id,
          chunks: processedDocument.chunks.length,
          contentLength: processedDocument.content.length,
        });
      } catch (error) {
        console.error('Error processing document:', error);
        // Don't fail the upload if processing fails, but log it
        // The document will still be available for download
      }

      return createdDocument;
    } catch (error) {
      console.error('Error uploading document:', error);

      // Rollback: Clean up any created resources
      if (createdDocument) {
        try {
          console.log('Rolling back: Deleting document record');
          await this.documentsService.remove(createdDocument.id, req.user.sub);
        } catch (rollbackError) {
          console.error('Failed to rollback document record:', rollbackError);
        }
      }

      if (uploadedFileUrl) {
        try {
          console.log('Rolling back: Deleting file from S3');
          await this.s3Service.deleteDocument(uploadedFileUrl);
        } catch (rollbackError) {
          console.error('Failed to rollback S3 file:', rollbackError);
        }
      }

      throw new BadRequestException('Failed to upload document');
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

      console.log('Document search request:', {
        query,
        limit,
        userId: req.user.sub,
      });

      if (!this.qdrantService) {
        throw new BadRequestException('Vector database not available');
      }

      const searchResults = await this.qdrantService.searchDocuments(
        query,
        req.user.sub,
        limit,
      );

      // Map document IDs to actual document information for search results
      const documentMap = new Map();
      const documents = await this.prisma.legalDocument.findMany({
        where: { uploadedById: req.user.sub },
        select: { id: true, originalFilename: true, title: true },
      });

      documents.forEach((doc) => {
        documentMap.set(doc.id, {
          title: (doc.title || doc.originalFilename) as string,
        });
      });

      const enhancedResults = searchResults.map((result) => {
        const documentInfo = documentMap.get(result.document_id);
        return {
          ...result,
          document_title: documentInfo?.title || 'Unknown Document',
        };
      });

      const result = {
        query,
        results: enhancedResults,
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
    } catch (error) {
      console.error('Error processing document search:', error);
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
      const { query, mode = 'qa', context, limit = 10 } = queryDto;

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

      // AI Assistant mode - use Mistral 7B for sophisticated AI responses
      console.log('Using Mistral 7B for AI Assistant mode');

      try {
        // Use the QdrantService to generate responses
        const qaResponse = await this.qdrantService.queryDocuments(
          query,
          req.user.sub,
        );

        // Map document IDs to actual document information
        const documentMap = new Map();
        const documents = await this.prisma.legalDocument.findMany({
          where: { uploadedById: req.user.sub },
          select: { id: true, originalFilename: true, title: true },
        });

        documents.forEach((doc) => {
          documentMap.set(doc.id, {
            title: (doc.title || doc.originalFilename) as string,
          });
        });

        const result = {
          question: query,
          answer: qaResponse.answer,
          sources: qaResponse.sources.map((source) => {
            const documentInfo = documentMap.get(source.document_id) as
              | { title: string }
              | undefined;

            return {
              document_id: source.document_id,
              document_title: documentInfo?.title || 'Unknown Document',
              content: source.content,
              score: source.score,
              page_number: source.page_number,
              start_char: source.start_char,
              end_char: source.end_char,
            };
          }),
          confidence: qaResponse.confidence,
          generated_at: new Date().toISOString(),
        };

        // Log the Q&A query
        await this.documentsService.logDocumentQuery(
          req.user.sub,
          query,
          qaResponse.answer,
          undefined,
          qaResponse.sources,
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
