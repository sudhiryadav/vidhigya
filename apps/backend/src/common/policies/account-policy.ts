import { PracticeType, UserRole } from '@prisma/client';

export const PUBLIC_SIGNUP_ALLOWED_ROLES: UserRole[] = [
  UserRole.LAWYER,
  UserRole.ADMIN,
];

export const INVITE_ONLY_ROLES: UserRole[] = [
  UserRole.LAWYER,
  UserRole.ASSOCIATE,
  UserRole.PARALEGAL,
  UserRole.CLIENT,
];

export const INTERNAL_ONLY_ROLES: UserRole[] = [UserRole.SUPER_ADMIN];

export const DEFAULT_PLAN_BY_PRACTICE_TYPE: Record<PracticeType, string> = {
  INDIVIDUAL: 'SOLO',
  FIRM: 'FIRM_STARTER',
  MIXED: 'FIRM_GROWTH',
};

export interface PlanEntitlement {
  marketingName: string;
  seatLimit: number;
  aiDailyUserLimit: number;
  aiDailyPracticeLimit: number;
  features: {
    advancedBilling: boolean;
    videoCollaboration: boolean;
    expandedAnalytics: boolean;
    customComplianceWorkflows: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_ENTITLEMENTS_BY_PLAN: Record<string, PlanEntitlement> = {
  SOLO: {
    marketingName: 'Starter',
    seatLimit: 1,
    aiDailyUserLimit: 25,
    aiDailyPracticeLimit: 100,
    features: {
      advancedBilling: false,
      videoCollaboration: false,
      expandedAnalytics: false,
      customComplianceWorkflows: false,
      prioritySupport: false,
    },
  },
  FIRM_STARTER: {
    marketingName: 'Starter',
    seatLimit: 5,
    aiDailyUserLimit: 40,
    aiDailyPracticeLimit: 250,
    features: {
      advancedBilling: false,
      videoCollaboration: false,
      expandedAnalytics: false,
      customComplianceWorkflows: false,
      prioritySupport: false,
    },
  },
  FIRM_GROWTH: {
    marketingName: 'Growth',
    seatLimit: 20,
    aiDailyUserLimit: 120,
    aiDailyPracticeLimit: 1000,
    features: {
      advancedBilling: true,
      videoCollaboration: true,
      expandedAnalytics: true,
      customComplianceWorkflows: false,
      prioritySupport: false,
    },
  },
  FIRM_SCALE: {
    marketingName: 'Enterprise',
    seatLimit: 200,
    aiDailyUserLimit: 300,
    aiDailyPracticeLimit: 4000,
    features: {
      advancedBilling: true,
      videoCollaboration: true,
      expandedAnalytics: true,
      customComplianceWorkflows: true,
      prioritySupport: true,
    },
  },
};

export const DEFAULT_SEAT_LIMIT_BY_PLAN: Record<string, number> = {
  SOLO: PLAN_ENTITLEMENTS_BY_PLAN.SOLO.seatLimit,
  FIRM_STARTER: PLAN_ENTITLEMENTS_BY_PLAN.FIRM_STARTER.seatLimit,
  FIRM_GROWTH: PLAN_ENTITLEMENTS_BY_PLAN.FIRM_GROWTH.seatLimit,
  FIRM_SCALE: PLAN_ENTITLEMENTS_BY_PLAN.FIRM_SCALE.seatLimit,
};

export const ALLOWED_SUBSCRIPTION_PLANS = Object.keys(
  DEFAULT_SEAT_LIMIT_BY_PLAN,
);

export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'authenticated'];

export const RESTRICTED_SUBSCRIPTION_STATUSES = [
  'halted',
  'cancelled',
  'completed',
  'expired',
  'payment_failed',
];

export function isPublicSignupRole(role: UserRole): boolean {
  return PUBLIC_SIGNUP_ALLOWED_ROLES.includes(role);
}

export function isInviteOnlyRole(role: UserRole): boolean {
  return INVITE_ONLY_ROLES.includes(role);
}

export function isInternalOnlyRole(role: UserRole): boolean {
  return INTERNAL_ONLY_ROLES.includes(role);
}

export function getPracticePlanKey(practiceId: string): string {
  return `practice.${practiceId}.subscription.plan`;
}

export function getPracticeSeatLimitKey(practiceId: string): string {
  return `practice.${practiceId}.subscription.seat_limit`;
}

export function getPracticePaddleCustomerIdKey(practiceId: string): string {
  return `practice.${practiceId}.subscription.paddle_customer_id`;
}

export function getPracticePaddleSubscriptionIdKey(practiceId: string): string {
  return `practice.${practiceId}.subscription.paddle_subscription_id`;
}

export function getPracticeSubscriptionStatusKey(practiceId: string): string {
  return `practice.${practiceId}.subscription.status`;
}
