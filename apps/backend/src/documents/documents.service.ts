import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentCategory, DocumentStatus } from '@prisma/client';
import { QdrantService } from '../config/qdrant.service';
import { LogsService } from '../logs/logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDocumentQueryDto,
  QueryType,
} from './dto/create-document-query.dto';

export interface CreateDocumentDto {
  title: string;
  description?: string;
  fileUrl: string;
  originalFilename?: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  caseId?: string;
  uploadedById: string;
  aiDocumentId?: string;
  practiceId: string;
}

interface DocumentQuery {
  caseId?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrantService: QdrantService,
    private readonly logsService: LogsService,
  ) {}

  // Helper method to validate practice access
  private async validatePracticeAccess(userId: string, practiceId: string) {
    // Check if user is a super admin (bypass practice check)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user is a member of the practice
    const practiceMember = await this.prisma.practiceMember.findFirst({
      where: {
        practiceId,
        userId,
        isActive: true,
      },
    });

    if (!practiceMember) {
      throw new ForbiddenException('Access denied to this practice');
    }

    return true;
  }

  async create(createDocumentDto: CreateDocumentDto) {
    // Validate practice access
    await this.validatePracticeAccess(
      createDocumentDto.uploadedById,
      createDocumentDto.practiceId,
    );

    return this.prisma.legalDocument.create({
      data: createDocumentDto,
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, query: DocumentQuery = {}) {
    // Get user's role and practice information
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    let where: Record<string, unknown> = {};

    // SUPER_ADMIN can see all documents
    if (user.role === 'SUPER_ADMIN') {
      // No additional filters needed
    }
    // ADMIN can see all documents from all practices (read-only access)
    else if (user.role === 'ADMIN') {
      // No additional filters needed - admin can see all documents
    }
    // LAWYER, ASSOCIATE, and PARALEGAL can see documents from their practices
    else if (['LAWYER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)) {
      const practiceIds = user.practices.map((p) => p.practiceId);
      if (practiceIds.length > 0) {
        where.practiceId = { in: practiceIds };
      } else {
        // If no practices, they can only see their own documents
        where.uploadedById = userId;
      }
    }
    // CLIENT can only see their own documents
    else {
      where.uploadedById = userId;
    }

    if (query.caseId) {
      where.caseId = query.caseId;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.legalDocument.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
            assignedLawyerId: true,
            clientId: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, document.practiceId);

    // Check if user has access to this document
    if (
      document.case &&
      document.case.assignedLawyerId !== userId &&
      document.case.clientId !== userId &&
      document.uploadedById !== userId
    ) {
      throw new BadRequestException('Access denied');
    }

    return document;
  }

  async remove(id: string, userId: string) {
    // Check if user has access to this document
    const document = await this.findOne(id, userId);

    try {
      // Delete embeddings from Qdrant for main document using stored AI document ID
      let qdrantDeleted = false;
      if (document.aiDocumentId) {
        qdrantDeleted = await this.qdrantService.deleteDocumentEmbeddings(
          document.aiDocumentId,
        );
        console.log(
          `Deleted embeddings for AI document ID: ${document.aiDocumentId}`,
        );
      } else {
        console.log(`No AI document ID found for document: ${id}`);
      }

      if (qdrantDeleted) {
        await this.logsService.create({
          level: 'info',
          message: `Successfully deleted embeddings from Qdrant for document ${id}`,
          userId,
          meta: { documentId: id, action: 'qdrant_cleanup' },
        });
      } else {
        await this.logsService.create({
          level: 'warn',
          message: `Failed to delete embeddings from Qdrant for document ${id}`,
          userId,
          meta: { documentId: id, action: 'qdrant_cleanup' },
        });
      }

      // Delete the document from database (this will cascade delete versions)
      const deletedDocument = await this.prisma.legalDocument.delete({
        where: { id },
      });

      await this.logsService.create({
        level: 'info',
        message: `Successfully deleted document ${id}`,
        userId,
        meta: {
          documentId: id,
          documentTitle: document.title,
          action: 'document_deletion',
          qdrantCleaned: qdrantDeleted,
        },
      });

      return deletedDocument;
    } catch (error) {
      await this.logsService.create({
        level: 'error',
        message: `Failed to delete document ${id}`,
        userId,
        meta: {
          documentId: id,
          error: error instanceof Error ? error.message : String(error),
          action: 'document_deletion',
        },
      });
      throw error;
    }
  }

  async logDocumentQuery(
    userId: string,
    question: string,
    answer: string,
    caseId?: string,
    sources?: any[],
    responseTime?: number,
    tokensUsed?: number,
    queryType: QueryType = QueryType.GENERAL,
  ) {
    try {
      // Get user's primary practice ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { primaryPracticeId: true },
      });

      if (!user?.primaryPracticeId) {
        console.warn(
          'User has no primary practice, skipping document query log',
        );
        return;
      }

      const queryData: CreateDocumentQueryDto = {
        question,
        answer,
        caseId,
        sources,
        queryType,
        responseTime,
        tokensUsed,
        practiceId: user.primaryPracticeId,
      };

      await this.prisma.documentQuery.create({
        data: {
          userId,
          practiceId: user.primaryPracticeId,
          ...queryData,
        },
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log document query:', error);
    }
  }
}
