import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentCategory, DocumentStatus } from '@prisma/client';
import { RedactingLogger } from '../common/logging';
import {
  PLAN_ENTITLEMENTS_BY_PLAN,
  getPracticePlanKey,
} from '../common/policies/account-policy';
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
  status?: DocumentStatus;
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

interface DocumentAccessContext {
  role: string;
  practiceIds: string[];
}

export interface AiUsageQuotaSnapshot {
  practiceId: string;
  plan: string;
  planLabel: string;
  usageDate: string;
  userUsedToday: number;
  userDailyLimit: number;
  userRemainingToday: number;
  practiceUsedToday: number;
  practiceDailyLimit: number;
  practiceRemainingToday: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new RedactingLogger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrantService: QdrantService,
    private readonly logsService: LogsService,
    private readonly configService: ConfigService,
  ) {}

  private getUtcDayBounds(date = new Date()): { start: Date; end: Date } {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private async resolvePracticeForAiUsage(userId: string): Promise<{
    practiceId: string;
    plan: string;
  }> {
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
      throw new ForbiddenException(
        'No practice is associated with this user account.',
      );
    }

    const planSetting = await this.prisma.systemSettings.findUnique({
      where: { key: getPracticePlanKey(practiceId) },
      select: { value: true },
    });

    const plan = planSetting?.value || 'FIRM_STARTER';
    return { practiceId, plan };
  }

  async getAiUsageQuotaSnapshot(userId: string): Promise<AiUsageQuotaSnapshot> {
    const { practiceId, plan } = await this.resolvePracticeForAiUsage(userId);
    const planEntitlement =
      PLAN_ENTITLEMENTS_BY_PLAN[plan] || PLAN_ENTITLEMENTS_BY_PLAN.FIRM_STARTER;
    const { start, end } = this.getUtcDayBounds();

    const [userUsedToday, practiceUsedToday] = await Promise.all([
      this.prisma.documentQuery.count({
        where: {
          userId,
          isDeleted: false,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      }),
      this.prisma.documentQuery.count({
        where: {
          practiceId,
          isDeleted: false,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      }),
    ]);

    return {
      practiceId,
      plan,
      planLabel: planEntitlement.marketingName,
      usageDate: start.toISOString().slice(0, 10),
      userUsedToday,
      userDailyLimit: planEntitlement.aiDailyUserLimit,
      userRemainingToday: Math.max(
        planEntitlement.aiDailyUserLimit - userUsedToday,
        0,
      ),
      practiceUsedToday,
      practiceDailyLimit: planEntitlement.aiDailyPracticeLimit,
      practiceRemainingToday: Math.max(
        planEntitlement.aiDailyPracticeLimit - practiceUsedToday,
        0,
      ),
    };
  }

  async enforceAiUsageWithinDailyLimits(
    userId: string,
  ): Promise<AiUsageQuotaSnapshot> {
    const snapshot = await this.getAiUsageQuotaSnapshot(userId);

    if (snapshot.userUsedToday >= snapshot.userDailyLimit) {
      throw new ForbiddenException(
        `Daily AI limit reached for your account (${snapshot.userUsedToday}/${snapshot.userDailyLimit}). Please retry tomorrow or upgrade your plan.`,
      );
    }

    if (snapshot.practiceUsedToday >= snapshot.practiceDailyLimit) {
      throw new ForbiddenException(
        `Daily AI limit reached for your practice (${snapshot.practiceUsedToday}/${snapshot.practiceDailyLimit}). Please retry tomorrow or upgrade your plan.`,
      );
    }

    return snapshot;
  }

  /**
   * Ask the Python AI service to stop a background embedding job (cooperative cancel).
   */
  private async cancelAiProcessing(aiDocumentId: string): Promise<void> {
    const base = this.configService.get<string>('AI_SERVICE_URL');
    const key = this.configService.get<string>('MODAL_DOT_COM_X_API_KEY');
    if (!base?.trim() || !key?.trim()) {
      this.logger.warn(
        'AI_SERVICE_URL or MODAL_DOT_COM_X_API_KEY not set; skip AI cancel',
      );
      return;
    }
    const url = `${base.replace(/\/$/, '')}/api/v1/admin/documents/cancel/${encodeURIComponent(aiDocumentId)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-Key': key,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(
          `AI cancel returned HTTP ${res.status} for ${aiDocumentId}`,
        );
      }
    } catch (e) {
      this.logger.warn(
        `AI cancel failed for ${aiDocumentId} (continuing with delete)`,
        e instanceof Error ? e.message : e,
      );
    }
  }

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

  private async getDocumentAccessContext(
    userId: string,
  ): Promise<DocumentAccessContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    return {
      role: user.role,
      practiceIds: user.practices.map((p) => p.practiceId),
    };
  }

  private buildDocumentReadWhere(
    userId: string,
    access: DocumentAccessContext,
  ): Record<string, unknown> {
    if (access.role === 'SUPER_ADMIN') {
      return {};
    }

    // Firm owner/admin and lead lawyer: full access inside their own practice(s).
    if (access.role === 'ADMIN' || access.role === 'LAWYER') {
      if (access.practiceIds.length === 0) {
        return { uploadedById: userId };
      }
      return { practiceId: { in: access.practiceIds } };
    }

    // Associates/paralegals: only own uploads or case/client-linked documents
    // within their practice context.
    if (access.role === 'ASSOCIATE' || access.role === 'PARALEGAL') {
      return {
        OR: [
          { uploadedById: userId },
          { case: { assignedLawyerId: userId } },
          { case: { clientId: userId } },
          { client: { userId } },
        ],
        ...(access.practiceIds.length > 0
          ? { practiceId: { in: access.practiceIds } }
          : {}),
      };
    }

    // Client users: only their own client-linked documents.
    return {
      OR: [
        { uploadedById: userId },
        { case: { clientId: userId } },
        { client: { userId } },
      ],
    };
  }

  private canReadDocument(
    userId: string,
    access: DocumentAccessContext,
    document: {
      uploadedById: string;
      practiceId: string;
      case: { assignedLawyerId: string; clientId: string } | null;
      client: { userId: string | null } | null;
    },
  ): boolean {
    if (access.role === 'SUPER_ADMIN') {
      return true;
    }

    const inPractice = access.practiceIds.includes(document.practiceId);
    const linkedToUser =
      document.uploadedById === userId ||
      document.case?.assignedLawyerId === userId ||
      document.case?.clientId === userId ||
      document.client?.userId === userId;

    if (access.role === 'ADMIN' || access.role === 'LAWYER') {
      return inPractice;
    }

    if (access.role === 'ASSOCIATE' || access.role === 'PARALEGAL') {
      return inPractice && linkedToUser;
    }

    return linkedToUser;
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

    const normalizedCaseId = createDocumentDto.caseId?.trim() || undefined;
    if (normalizedCaseId) {
      const linkedCase = await this.prisma.legalCase.findFirst({
        where: {
          id: normalizedCaseId,
          practiceId: createDocumentDto.practiceId,
        },
        select: { id: true },
      });

      if (!linkedCase) {
        throw new BadRequestException(
          'Invalid caseId for the selected practice.',
        );
      }
    }

    return this.prisma.legalDocument.create({
      data: {
        ...createDocumentDto,
        caseId: normalizedCaseId,
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
      },
    });
  }

  async findAll(userId: string, query: DocumentQuery = {}) {
    const access = await this.getDocumentAccessContext(userId);
    const where: Record<string, unknown> = this.buildDocumentReadWhere(
      userId,
      access,
    );

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
    const access = await this.getDocumentAccessContext(userId);

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
        client: {
          select: {
            userId: true,
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
          client: {
            select: {
              userId: true,
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

    if (
      !this.canReadDocument(userId, access, {
        uploadedById: document.uploadedById,
        practiceId: document.practiceId,
        case: document.case
          ? {
              assignedLawyerId: document.case.assignedLawyerId,
              clientId: document.case.clientId,
            }
          : null,
        client: document.client
          ? {
              userId: document.client.userId,
            }
          : null,
      })
    ) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async remove(id: string, userId: string) {
    // Check if user has access to this document
    const document = await this.findOne(id, userId);

    try {
      if (document.status === 'PROCESSING' && document.aiDocumentId) {
        await this.cancelAiProcessing(document.aiDocumentId);
      }

      // Delete embeddings from Qdrant for main document using stored AI document ID
      let qdrantDeleted = false;
      if (document.aiDocumentId) {
        if (document.aiDocumentId.startsWith('files/')) {
          this.logger.log(
            `Skipping Qdrant deletion for Google file-backed document ID: ${document.aiDocumentId}`,
          );
        } else {
          qdrantDeleted = await this.qdrantService.deleteDocumentEmbeddings(
            document.aiDocumentId,
          );
          this.logger.log(
            `Deleted embeddings for AI document ID: ${document.aiDocumentId}`,
          );
        }
      } else {
        this.logger.log(`No AI document ID found for document: ${id}`);
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
        this.logger.warn(
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
      this.logger.error('Failed to log document query:', error);
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
