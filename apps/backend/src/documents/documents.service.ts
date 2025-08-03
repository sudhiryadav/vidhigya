import {
  BadRequestException,
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
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  caseId?: string;
  uploadedById: string;
}

export interface UploadNewVersionDto {
  fileUrl: string;
  fileType: string;
  fileSize: number;
  changeReason?: string;
  uploadedById: string;
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

  async create(createDocumentDto: CreateDocumentDto) {
    return this.prisma.legalDocument.create({
      data: {
        ...createDocumentDto,
        version: 1,
        versions: {
          create: {
            version: 1,
            fileUrl: createDocumentDto.fileUrl,
            fileType: createDocumentDto.fileType,
            fileSize: createDocumentDto.fileSize,
            uploadedById: createDocumentDto.uploadedById,
            changeReason: 'Initial version',
          },
        },
      },
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
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
  }

  async uploadNewVersion(documentId: string, uploadDto: UploadNewVersionDto) {
    // Check if user has access to this document
    await this.findOne(documentId, uploadDto.uploadedById);

    // Get current document to increment version
    const currentDoc = await this.prisma.legalDocument.findUnique({
      where: { id: documentId },
      select: { version: true },
    });

    if (!currentDoc) {
      throw new NotFoundException('Document not found');
    }

    const newVersion = currentDoc.version + 1;

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Create new version record
      await tx.documentVersion.create({
        data: {
          documentId,
          version: newVersion,
          fileUrl: uploadDto.fileUrl,
          fileType: uploadDto.fileType,
          fileSize: uploadDto.fileSize,
          uploadedById: uploadDto.uploadedById,
          changeReason: uploadDto.changeReason || `Version ${newVersion}`,
        },
      });

      // Update main document record
      const updatedDoc = await tx.legalDocument.update({
        where: { id: documentId },
        data: {
          fileUrl: uploadDto.fileUrl,
          fileType: uploadDto.fileType,
          fileSize: uploadDto.fileSize,
          version: newVersion,
          updatedAt: new Date(),
        },
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
          versions: {
            orderBy: { version: 'desc' },
            take: 5, // Show last 5 versions
          },
        },
      });

      return updatedDoc;
    });
  }

  async findAll(userId: string, query: DocumentQuery = {}) {
    const where: {
      uploadedById: string;
      caseId?: string;
      category?: DocumentCategory;
      status?: DocumentStatus;
    } = {
      uploadedById: userId,
    };

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
        versions: {
          orderBy: { version: 'desc' },
          take: 1, // Only show current version in list
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
        versions: {
          orderBy: { version: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

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

  async getVersion(id: string, version: number, userId: string) {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            assignedLawyerId: true,
            clientId: true,
          },
        },
        versions: {
          where: { version },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if user has access to this document
    if (
      document.case &&
      document.case.assignedLawyerId !== userId &&
      document.case.clientId !== userId &&
      document.uploadedById !== userId
    ) {
      throw new BadRequestException('Access denied');
    }

    const versionRecord = document.versions[0];
    if (!versionRecord) {
      throw new NotFoundException('Version not found');
    }

    return versionRecord;
  }

  async remove(id: string, userId: string) {
    // Check if user has access to this document
    const document = await this.findOne(id, userId);

    try {
      // Delete embeddings from Qdrant for main document
      const qdrantDeleted =
        await this.qdrantService.deleteDocumentEmbeddings(id);

      // Delete embeddings for all document versions
      let versionsDeleted = 0;
      if (document.versions && document.versions.length > 0) {
        for (const version of document.versions) {
          try {
            // Delete embeddings using the stored AI document ID for this version
            // Type assertion needed because Prisma types don't include aiDocumentId yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const versionWithAiId = version as any;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (versionWithAiId.aiDocumentId) {
              const versionEmbeddingsDeleted =
                await this.qdrantService.deleteDocumentEmbeddings(
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
                  versionWithAiId.aiDocumentId,
                );
              if (versionEmbeddingsDeleted) {
                versionsDeleted++;
              }
            }
          } catch (error) {
            console.error(
              `Failed to delete embeddings for version ${version.version}:`,
              error,
            );
            // Continue with other versions even if one fails
          }
        }
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
          versionsCleaned: versionsDeleted,
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

  async getVersionHistory(id: string, userId: string) {
    // Check if user has access to this document
    await this.findOne(id, userId);

    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
      include: {
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

  async updateVersionAiDocumentId(
    documentId: string,
    version: number,
    aiDocumentId: string,
  ) {
    return this.prisma.documentVersion.update({
      where: {
        documentId_version: {
          documentId,
          version,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: {
        aiDocumentId: aiDocumentId,
      } as any,
    });
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
      const queryData: CreateDocumentQueryDto = {
        question,
        answer,
        caseId,
        sources,
        queryType,
        responseTime,
        tokensUsed,
      };

      await this.prisma.documentQuery.create({
        data: {
          userId,
          ...queryData,
        },
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log document query:', error);
    }
  }
}
