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

  /** Resolve practice for uploads when JWT context must match DB (primary or first active membership). */
  async resolvePracticeIdForDocumentUpload(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          orderBy: { joinDate: 'asc' },
          take: 1,
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const practiceId =
      user.primaryPracticeId ?? user.practices[0]?.practiceId ?? null;

    if (!practiceId) {
      throw new BadRequestException(
        'No practice is associated with your account. Join or create a practice before uploading documents.',
      );
    }

    return practiceId;
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

    const where: Record<string, unknown> = {};

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
    let document = await this.prisma.legalDocument.findUnique({
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
      document = await this.prisma.legalDocument.findFirst({
        where: { aiDocumentId: id },
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
    }

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

  /**
   * Qdrant chunk payloads use `document_id` as either LegalDocument.id or
   * LegalDocument.aiDocumentId (see AI ingest). Normalize to legal row id and title.
   * Drops hits the user cannot access (same rules as findOne).
   */
  async enrichVectorSearchHits<
    T extends {
      document_id: string;
      content: string;
      score: number;
      page_number?: number;
      start_char?: number;
      end_char?: number;
    },
  >(hits: T[], userId: string): Promise<Array<T & { document_title: string }>> {
    if (!hits.length) return [];

    const rawIds = [...new Set(hits.map((h) => h.document_id).filter(Boolean))];
    const candidates = await this.prisma.legalDocument.findMany({
      where: {
        OR: [{ id: { in: rawIds } }, { aiDocumentId: { in: rawIds } }],
      },
      select: {
        id: true,
        aiDocumentId: true,
        title: true,
        originalFilename: true,
      },
    });

    const rawKeyToLegalId = new Map<string, string>();
    const titleByLegalId = new Map<string, string>();
    for (const d of candidates) {
      const label = d.title || d.originalFilename || 'Untitled';
      rawKeyToLegalId.set(d.id, d.id);
      titleByLegalId.set(d.id, label);
      if (d.aiDocumentId) {
        rawKeyToLegalId.set(d.aiDocumentId, d.id);
      }
    }

    const accessCache = new Map<string, boolean>();
    const allowed = async (legalId: string): Promise<boolean> => {
      if (accessCache.has(legalId)) {
        return accessCache.get(legalId);
      }
      try {
        await this.findOne(legalId, userId);
        accessCache.set(legalId, true);
        return true;
      } catch {
        accessCache.set(legalId, false);
        return false;
      }
    };

    const out: Array<T & { document_title: string }> = [];

    for (const hit of hits) {
      const legalId = rawKeyToLegalId.get(hit.document_id);
      if (!legalId || !(await allowed(legalId))) {
        continue;
      }

      out.push({
        ...hit,
        document_id: legalId,
        document_title: titleByLegalId.get(legalId) || 'Untitled',
      });
    }

    return out;
  }

  /**
   * The LLM sometimes echoes vector hits as a JSON array. Turn that into plain text
   * for the chat UI; prefer enriched sources for titles when ids match.
   */
  normalizeDocumentQueryAnswer(
    rawAnswer: string | undefined,
    formattedSources: Array<{
      document_id: string;
      document_title: string;
      content?: string;
    }>,
  ): string {
    const excerptFromSource = (
      title: string,
      content: string | undefined,
      index: number,
    ): string => {
      const excerpt = (content ?? '').replace(/\s+/g, ' ').trim().slice(0, 450);
      const suffix =
        excerpt.length > 0 && (content?.length ?? 0) > 450 ? '…' : '';
      return `${index + 1}. ${title}: ${excerpt}${suffix}`;
    };

    const fallbackFromSources = (): string => {
      if (!formattedSources.length) {
        return 'I could not summarize the results. Please try rephrasing your question.';
      }
      const lines = formattedSources
        .slice(0, 8)
        .map((s, i) => excerptFromSource(s.document_title, s.content, i));
      return [
        'Here are the most relevant excerpts from your documents:',
        '',
        ...lines,
      ].join('\n');
    };

    if (!rawAnswer?.trim()) {
      return fallbackFromSources();
    }

    const t = rawAnswer.trim();
    if (!t.startsWith('[')) {
      return rawAnswer;
    }

    try {
      const parsed = JSON.parse(t) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return rawAnswer;
      }
      const first = parsed[0] as Record<string, unknown>;
      const looksLikeVectorHit =
        typeof first?.content === 'string' ||
        typeof first?.document_id === 'string';
      if (!looksLikeVectorHit) {
        return rawAnswer;
      }

      const lines = parsed
        .slice(0, 8)
        .map((item: Record<string, unknown>, i: number) => {
          const id =
            typeof item.document_id === 'string' ? item.document_id : '';
          const titleMatch = formattedSources.find((s) => s.document_id === id);
          const title = titleMatch?.document_title ?? 'Document';
          const content =
            typeof item.content === 'string'
              ? item.content
              : titleMatch?.content;
          return excerptFromSource(title, content, i);
        });

      return [
        'Here are the most relevant excerpts from your documents:',
        '',
        ...lines,
      ].join('\n');
    } catch {
      return fallbackFromSources();
    }
  }
}
