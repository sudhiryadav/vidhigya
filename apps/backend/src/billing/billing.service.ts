import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillStatus, BillType, Currency } from '@prisma/client';
import { createHmac } from 'crypto';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  DEFAULT_PLAN_BY_PRACTICE_TYPE,
  DEFAULT_SEAT_LIMIT_BY_PLAN,
  PLAN_ENTITLEMENTS_BY_PLAN,
  getPracticePlanKey,
  getPracticeRazorpayCustomerIdKey,
  getPracticeRazorpaySubscriptionIdKey,
  getPracticeSeatLimitKey,
  getPracticeSubscriptionStatusKey,
} from '../common/policies/account-policy';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBillingRecordDto {
  amount: number;
  currency?: Currency;
  description: string;
  billType: BillType;
  dueDate?: Date | string;
  caseId?: string;
  clientId?: string;
  userId: string;
  practiceId?: string;
}

export interface UpdateBillingRecordDto {
  amount?: number;
  currency?: Currency;
  description?: string;
  billType?: BillType;
  status?: BillStatus;
  dueDate?: Date | string;
  paidDate?: Date | string;
  caseId?: string;
}

interface BillingAccessContext {
  role: string;
  practiceIds: string[];
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private getRazorpayConfig() {
    return {
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID') || '',
      keySecret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || '',
      webhookSecret:
        this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '',
      planMap: {
        SOLO: this.configService.get<string>('RAZORPAY_PLAN_SOLO') || '',
        FIRM_STARTER:
          this.configService.get<string>('RAZORPAY_PLAN_FIRM_STARTER') || '',
        FIRM_GROWTH:
          this.configService.get<string>('RAZORPAY_PLAN_FIRM_GROWTH') || '',
        FIRM_SCALE:
          this.configService.get<string>('RAZORPAY_PLAN_FIRM_SCALE') || '',
      },
    };
  }

  private getRazorpayBasicAuthHeader(): string {
    const { keyId, keySecret } = this.getRazorpayConfig();
    if (!keyId || !keySecret) {
      throw new BadRequestException(
        'Razorpay is not configured. Please set Razorpay credentials.',
      );
    }
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  private async resolveUserPracticeSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const practiceId = user.primaryPracticeId ?? user.practices[0]?.practiceId;
    if (!practiceId) {
      throw new ForbiddenException('No practice access found for this user');
    }

    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      select: { id: true, name: true, practiceType: true },
    });

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    return { user, practice };
  }

  private async readPracticeSubscription(practiceId: string) {
    const [
      practice,
      activeMembers,
      planSetting,
      seatLimitSetting,
      statusSetting,
    ] = await Promise.all([
      this.prisma.practice.findUnique({
        where: { id: practiceId },
        select: { id: true, name: true, practiceType: true },
      }),
      this.prisma.practiceMember.count({
        where: { practiceId, isActive: true },
      }),
      this.prisma.systemSettings.findUnique({
        where: { key: getPracticePlanKey(practiceId) },
        select: { value: true },
      }),
      this.prisma.systemSettings.findUnique({
        where: { key: getPracticeSeatLimitKey(practiceId) },
        select: { value: true },
      }),
      this.prisma.systemSettings.findUnique({
        where: { key: getPracticeSubscriptionStatusKey(practiceId) },
        select: { value: true },
      }),
    ]);

    if (!practice) {
      throw new NotFoundException('Practice not found');
    }

    const fallbackPlan = DEFAULT_PLAN_BY_PRACTICE_TYPE[practice.practiceType];
    const plan = planSetting?.value || fallbackPlan;
    const fallbackSeatLimit =
      DEFAULT_SEAT_LIMIT_BY_PLAN[plan] ??
      DEFAULT_SEAT_LIMIT_BY_PLAN.FIRM_STARTER;
    const parsedSeatLimit = seatLimitSetting
      ? Number.parseInt(seatLimitSetting.value, 10)
      : Number.NaN;
    const seatLimit = Number.isFinite(parsedSeatLimit)
      ? parsedSeatLimit
      : fallbackSeatLimit;
    const planEntitlement =
      PLAN_ENTITLEMENTS_BY_PLAN[plan] || PLAN_ENTITLEMENTS_BY_PLAN.FIRM_STARTER;

    return {
      practiceId,
      practiceName: practice.name,
      plan,
      seatLimit,
      activeMembers,
      availableSeats: Math.max(seatLimit - activeMembers, 0),
      status: statusSetting?.value || 'pending_activation',
      canAddUsers: ACTIVE_SUBSCRIPTION_STATUSES.includes(
        (statusSetting?.value || 'pending_activation').toLowerCase(),
      ),
      entitlements: {
        marketingName: planEntitlement.marketingName,
        features: planEntitlement.features,
        aiDailyUserLimit: planEntitlement.aiDailyUserLimit,
        aiDailyPracticeLimit: planEntitlement.aiDailyPracticeLimit,
      },
    };
  }

  async getMySubscription(userId: string) {
    const { practice } = await this.resolveUserPracticeSummary(userId);
    const [snapshot, razorpayCustomer, razorpaySubscription] =
      await Promise.all([
        this.readPracticeSubscription(practice.id),
        this.prisma.systemSettings.findUnique({
          where: { key: getPracticeRazorpayCustomerIdKey(practice.id) },
          select: { value: true },
        }),
        this.prisma.systemSettings.findUnique({
          where: { key: getPracticeRazorpaySubscriptionIdKey(practice.id) },
          select: { value: true },
        }),
      ]);

    return {
      ...snapshot,
      razorpayCustomerId: razorpayCustomer?.value || null,
      razorpaySubscriptionId: razorpaySubscription?.value || null,
      razorpayConfigured: !!this.getRazorpayConfig().keyId,
    };
  }

  async getSubscriptionsOverview() {
    const practices = await this.prisma.practice.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      practices.map(async (practice) => {
        const [snapshot, razorpaySub] = await Promise.all([
          this.readPracticeSubscription(practice.id),
          this.prisma.systemSettings.findUnique({
            where: { key: getPracticeRazorpaySubscriptionIdKey(practice.id) },
            select: { value: true },
          }),
        ]);
        return {
          ...snapshot,
          razorpaySubscriptionId: razorpaySub?.value || null,
        };
      }),
    );
  }

  async createRazorpayCheckout(
    userId: string,
    requestedPlan?: string,
  ): Promise<{
    keyId: string;
    subscriptionId: string;
    plan: string;
    status: string;
  }> {
    const { user, practice } = await this.resolveUserPracticeSummary(userId);
    const subscription = await this.readPracticeSubscription(practice.id);
    const targetPlan = requestedPlan || subscription.plan;
    const { keyId, planMap } = this.getRazorpayConfig();
    const planId = planMap[targetPlan as keyof typeof planMap];

    if (!planId) {
      throw new BadRequestException(
        `No Razorpay plan mapping found for plan ${targetPlan}`,
      );
    }

    const authHeader = this.getRazorpayBasicAuthHeader();

    const customerResp = await fetch('https://api.razorpay.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        notes: { practiceId: practice.id, app: 'vidhigya' },
      }),
    });

    if (!customerResp.ok) {
      throw new BadRequestException('Failed to create Razorpay customer');
    }

    const customerData = (await customerResp.json()) as { id: string };

    const subscriptionResp = await fetch(
      'https://api.razorpay.com/v1/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: 12,
          customer_notify: 1,
          customer_id: customerData.id,
          notes: { practiceId: practice.id, app: 'vidhigya', plan: targetPlan },
        }),
      },
    );

    if (!subscriptionResp.ok) {
      throw new BadRequestException('Failed to create Razorpay subscription');
    }

    const razorpaySubscription = (await subscriptionResp.json()) as {
      id: string;
      status: string;
    };

    await Promise.all([
      this.prisma.systemSettings.upsert({
        where: { key: getPracticeRazorpayCustomerIdKey(practice.id) },
        create: {
          key: getPracticeRazorpayCustomerIdKey(practice.id),
          value: customerData.id,
          category: 'subscription',
          isActive: true,
        },
        update: { value: customerData.id, isActive: true },
      }),
      this.prisma.systemSettings.upsert({
        where: { key: getPracticeRazorpaySubscriptionIdKey(practice.id) },
        create: {
          key: getPracticeRazorpaySubscriptionIdKey(practice.id),
          value: razorpaySubscription.id,
          category: 'subscription',
          isActive: true,
        },
        update: { value: razorpaySubscription.id, isActive: true },
      }),
      this.prisma.systemSettings.upsert({
        where: { key: getPracticeSubscriptionStatusKey(practice.id) },
        create: {
          key: getPracticeSubscriptionStatusKey(practice.id),
          value: razorpaySubscription.status || 'created',
          category: 'subscription',
          isActive: true,
        },
        update: {
          value: razorpaySubscription.status || 'created',
          isActive: true,
        },
      }),
      this.prisma.systemSettings.upsert({
        where: { key: getPracticePlanKey(practice.id) },
        create: {
          key: getPracticePlanKey(practice.id),
          value: targetPlan,
          category: 'subscription',
          isActive: true,
        },
        update: { value: targetPlan, isActive: true },
      }),
    ]);

    return {
      keyId,
      subscriptionId: razorpaySubscription.id,
      plan: targetPlan,
      status: razorpaySubscription.status || 'created',
    };
  }

  async handleRazorpayWebhook(rawBody: string, signature?: string) {
    const { webhookSecret } = this.getRazorpayConfig();
    if (!webhookSecret) {
      throw new BadRequestException(
        'Razorpay webhook secret is not configured',
      );
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!signature || signature !== expectedSignature) {
      throw new ForbiddenException('Invalid Razorpay webhook signature');
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        subscription?: {
          entity?: { id?: string; status?: string; notes?: any };
        };
      };
    };

    const webhookEvent = payload.event;
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const razorpaySubscriptionId = subscriptionEntity?.id;
    const subscriptionStatus = this.mapRazorpayEventToStatus(
      webhookEvent,
      subscriptionEntity?.status,
    );
    const practiceId = subscriptionEntity?.notes?.practiceId as
      | string
      | undefined;

    if (!razorpaySubscriptionId) {
      return { ok: true, ignored: true };
    }

    let resolvedPracticeId = practiceId;
    if (!resolvedPracticeId) {
      const mapped = await this.prisma.systemSettings.findFirst({
        where: {
          key: { contains: '.subscription.razorpay_subscription_id' },
          value: razorpaySubscriptionId,
        },
        select: { key: true },
      });
      if (mapped?.key) {
        resolvedPracticeId = mapped.key.split('.')[1];
      }
    }

    if (!resolvedPracticeId) {
      return { ok: true, ignored: true };
    }

    await this.prisma.systemSettings.upsert({
      where: { key: getPracticeSubscriptionStatusKey(resolvedPracticeId) },
      create: {
        key: getPracticeSubscriptionStatusKey(resolvedPracticeId),
        value: subscriptionStatus,
        category: 'subscription',
        isActive: true,
      },
      update: { value: subscriptionStatus, isActive: true },
    });

    const mappedSeatLimit =
      this.mapSeatLimitBySubscriptionStatus(subscriptionStatus);
    if (mappedSeatLimit !== null) {
      await this.prisma.systemSettings.upsert({
        where: { key: getPracticeSeatLimitKey(resolvedPracticeId) },
        create: {
          key: getPracticeSeatLimitKey(resolvedPracticeId),
          value: String(mappedSeatLimit),
          category: 'subscription',
          isActive: true,
        },
        update: { value: String(mappedSeatLimit), isActive: true },
      });
    }

    return {
      ok: true,
      practiceId: resolvedPracticeId,
      status: subscriptionStatus,
      event: webhookEvent,
    };
  }

  private mapRazorpayEventToStatus(
    event: string,
    fallbackStatus?: string,
  ): string {
    const normalizedEvent = (event || '').toLowerCase();
    if (normalizedEvent === 'subscription.activated') return 'active';
    if (normalizedEvent === 'subscription.authenticated')
      return 'authenticated';
    if (normalizedEvent === 'subscription.halted') return 'halted';
    if (normalizedEvent === 'subscription.cancelled') return 'cancelled';
    if (normalizedEvent === 'subscription.completed') return 'completed';
    if (normalizedEvent === 'subscription.expired') return 'expired';
    if (normalizedEvent === 'payment.failed') return 'payment_failed';
    return (fallbackStatus || event || 'pending_activation').toLowerCase();
  }

  private mapSeatLimitBySubscriptionStatus(status: string): number | null {
    const normalizedStatus = status.toLowerCase();
    if (ACTIVE_SUBSCRIPTION_STATUSES.includes(normalizedStatus)) {
      return null;
    }
    return 0;
  }

  private normalizeDateInput(
    fieldName: string,
    value?: Date | string,
  ): Date | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`Invalid ${fieldName}`);
      }
      return value;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    // Accept HTML date input format (YYYY-MM-DD) and convert to midnight UTC.
    const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
      ? `${trimmedValue}T00:00:00.000Z`
      : trimmedValue;
    const parsedDate = new Date(isoCandidate);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return parsedDate;
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

  private async getBillingAccessContext(
    userId: string,
  ): Promise<BillingAccessContext> {
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

  private buildBillingReadWhere(
    userId: string,
    access: BillingAccessContext,
  ): Record<string, unknown> {
    if (access.role === 'SUPER_ADMIN') return {};
    if (access.role === 'ADMIN' || access.role === 'LAWYER') {
      return access.practiceIds.length > 0
        ? { practiceId: { in: access.practiceIds } }
        : { userId };
    }
    if (access.role === 'ASSOCIATE' || access.role === 'PARALEGAL') {
      return {
        ...(access.practiceIds.length > 0
          ? { practiceId: { in: access.practiceIds } }
          : {}),
        OR: [
          { userId },
          { case: { assignedLawyerId: userId } },
          { case: { clientId: userId } },
          { client: { userId } },
        ],
      };
    }
    return {
      OR: [{ userId }, { case: { clientId: userId } }, { client: { userId } }],
    };
  }

  private canManageBilling(
    userId: string,
    access: BillingAccessContext,
    record: { practiceId: string; userId: string },
  ): boolean {
    if (access.role === 'SUPER_ADMIN') return true;
    if (access.role === 'ADMIN' || access.role === 'LAWYER') {
      return access.practiceIds.includes(record.practiceId);
    }
    if (access.role === 'ASSOCIATE' || access.role === 'PARALEGAL') {
      return (
        access.practiceIds.includes(record.practiceId) &&
        record.userId === userId
      );
    }
    return false;
  }

  private async resolveUserPracticeId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    const practiceId =
      user?.primaryPracticeId ?? user?.practices[0]?.practiceId;
    if (!practiceId) {
      throw new ForbiddenException('No practice access found for this user');
    }

    return practiceId;
  }

  async create(createBillingRecordDto: CreateBillingRecordDto) {
    let resolvedPracticeId = createBillingRecordDto.practiceId;
    let resolvedClientId = createBillingRecordDto.clientId;

    if (createBillingRecordDto.caseId) {
      const legalCase = await this.prisma.legalCase.findUnique({
        where: { id: createBillingRecordDto.caseId },
        select: {
          id: true,
          practiceId: true,
          clientId: true,
        },
      });

      if (!legalCase) {
        throw new NotFoundException('Case not found');
      }

      if (resolvedPracticeId && resolvedPracticeId !== legalCase.practiceId) {
        throw new BadRequestException(
          'Selected case does not belong to the provided practice',
        );
      }

      resolvedPracticeId = legalCase.practiceId;
      resolvedClientId = resolvedClientId ?? legalCase.clientId;
    } else if (resolvedClientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: resolvedClientId },
        select: {
          id: true,
          practiceId: true,
        },
      });

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      if (resolvedPracticeId && resolvedPracticeId !== client.practiceId) {
        throw new BadRequestException(
          'Selected client does not belong to the provided practice',
        );
      }

      resolvedPracticeId = resolvedPracticeId ?? client.practiceId;
    }

    if (!resolvedPracticeId) {
      resolvedPracticeId = await this.resolveUserPracticeId(
        createBillingRecordDto.userId,
      );
    }

    // Validate practice access
    await this.validatePracticeAccess(
      createBillingRecordDto.userId,
      resolvedPracticeId,
    );

    const normalizedDueDate = this.normalizeDateInput(
      'dueDate',
      createBillingRecordDto.dueDate,
    );

    return this.prisma.billingRecord.create({
      data: {
        ...createBillingRecordDto,
        dueDate: normalizedDueDate,
        practiceId: resolvedPracticeId,
        clientId: resolvedClientId,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, query: Record<string, unknown> = {}) {
    const access = await this.getBillingAccessContext(userId);
    const where: Record<string, unknown> = this.buildBillingReadWhere(
      userId,
      access,
    );

    if (query.status) {
      where.status = query.status;
    }

    if (query.billType) {
      where.billType = query.billType;
    }

    if (query.caseId) {
      where.caseId = query.caseId;
    }

    const billingRecords = await this.prisma.billingRecord.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return billingRecords;
  }

  async findOne(id: string, userId: string) {
    const access = await this.getBillingAccessContext(userId);
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: {
        id,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            assignedLawyerId: true,
            clientId: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    const canRead =
      access.role === 'SUPER_ADMIN' ||
      (access.role === 'ADMIN' || access.role === 'LAWYER'
        ? access.practiceIds.includes(billingRecord.practiceId)
        : access.role === 'ASSOCIATE' || access.role === 'PARALEGAL'
          ? access.practiceIds.includes(billingRecord.practiceId) &&
            (billingRecord.userId === userId ||
              billingRecord.case?.assignedLawyerId === userId ||
              billingRecord.case?.clientId === userId ||
              billingRecord.client?.userId === userId)
          : billingRecord.userId === userId ||
            billingRecord.case?.clientId === userId ||
            billingRecord.client?.userId === userId);

    if (!canRead) {
      throw new ForbiddenException('Access denied');
    }

    return billingRecord;
  }

  async update(
    id: string,
    updateBillingRecordDto: UpdateBillingRecordDto,
    userId: string,
  ) {
    const access = await this.getBillingAccessContext(userId);
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: { id },
      select: { id: true, userId: true, practiceId: true },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    if (!this.canManageBilling(userId, access, billingRecord)) {
      throw new ForbiddenException('Access denied');
    }

    const normalizedDueDate = this.normalizeDateInput(
      'dueDate',
      updateBillingRecordDto.dueDate,
    );
    const normalizedPaidDate = this.normalizeDateInput(
      'paidDate',
      updateBillingRecordDto.paidDate,
    );

    return this.prisma.billingRecord.update({
      where: { id },
      data: {
        ...updateBillingRecordDto,
        dueDate: normalizedDueDate,
        paidDate: normalizedPaidDate,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const access = await this.getBillingAccessContext(userId);
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: { id },
      select: { id: true, userId: true, practiceId: true },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    if (!this.canManageBilling(userId, access, billingRecord)) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.billingRecord.delete({
      where: { id },
    });
  }

  async markAsPaid(id: string, userId: string) {
    // Check if user has access to this billing record
    await this.findOne(id, userId);

    return this.prisma.billingRecord.update({
      where: { id },
      data: {
        status: BillStatus.PAID,
        paidDate: new Date(),
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUser(userId: string, currentUserId: string) {
    // Only allow users to see their own billing records or admin access
    if (userId !== currentUserId) {
      throw new NotFoundException('Access denied');
    }

    return this.prisma.billingRecord.findMany({
      where: { userId },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCase(caseId: string, currentUserId: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        caseId,
        userId: currentUserId,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBillingStats(userId: string) {
    const [
      totalBills,
      paidBills,
      pendingBills,
      overdueBills,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
    ] = await Promise.all([
      this.prisma.billingRecord.count({
        where: { userId },
      }),
      this.prisma.billingRecord.count({
        where: {
          userId,
          status: 'PAID',
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          userId,
          status: 'PENDING',
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          userId,
          status: 'OVERDUE',
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: { userId },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: {
          userId,
          status: 'PAID',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: {
          userId,
          status: 'PENDING',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.billingRecord.aggregate({
        where: {
          userId,
          status: 'OVERDUE',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      totalBills,
      paidBills,
      pendingBills,
      overdueBills,
      totalAmount: totalAmount._sum.amount || 0,
      paidAmount: paidAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      overdueAmount: overdueAmount._sum.amount || 0,
    };
  }

  async getOverdueBills(userId: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        userId,
        status: 'OVERDUE',
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }
}
