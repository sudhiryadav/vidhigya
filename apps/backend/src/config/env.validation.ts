import { z } from 'zod';

const nonempty = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(1),
);

const optionalUrl = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.string().url().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.preprocess((v) => {
      if (v === undefined || v === '') return 3889;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    }, z.number().int().min(1).max(65535)),

    FRONTEND_URL: optionalUrl,

    DATABASE_URL: nonempty,
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().default('24h'),

    AWS_REGION: nonempty,
    AWS_ACCESS_KEY_ID: nonempty,
    AWS_SECRET_ACCESS_KEY: nonempty,
    AWS_S3_BUCKET: nonempty,

    QDRANT_URL: z.string().url('QDRANT_URL must be a valid URL'),
    QDRANT_COLLECTION: nonempty,
    QDRANT_API_KEY: nonempty,

    AI_SERVICE_URL: z.string().url('AI_SERVICE_URL must be a valid URL'),
    AI_SERVICE_API_KEY: nonempty,

    MODAL_ENDPOINT_URL: optionalUrl,
    MODAL_HEALTH_CHECK_URL: optionalUrl,
    MODAL_KEEP_WARM_URL: optionalUrl,
    MODAL_API_KEY: z.string().optional(),

    REDIS_URL: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),

    MAX_DOCUMENT_SIZE: z.string().optional(),
    MAX_AVATAR_SIZE: z.string().optional(),

    GOOGLE_CALENDAR_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: optionalUrl,
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    GOOGLE_OCR_MODEL: z.string().optional(),
    GOOGLE_OCR_FALLBACK_MODELS: z.string().optional(),
    OCR_PROVIDER: z.enum(['current', 'google']).optional(),
    DOCUMENT_AI_PROVIDER: z.enum(['current', 'google']).optional(),
    GOOGLE_QUERY_MODEL: z.string().optional(),
    GOOGLE_QUERY_FALLBACK_MODELS: z.string().optional(),
    GOOGLE_QUERY_FALLBACK_TO_CURRENT: z.string().optional(),
    GOOGLE_QUERY_MAX_CHUNKS: z.string().optional(),
    GOOGLE_QUERY_MAX_CONTEXT_CHARS: z.string().optional(),
    GOOGLE_OCR_PREPASS_FOR_GOOGLE_AI: z.string().optional(),
    GOOGLE_OCR_TIMEOUT_MS: z.string().optional(),
    GOOGLE_OCR_MAX_INLINE_BYTES: z.string().optional(),

    ECOURTS_BASE_URL: z.string().url().optional(),
    ECOURTS_TIMEOUT: z.string().optional(),
    ECOURTS_RETRY_ATTEMPTS: z.string().optional(),
    ECOURTS_USER_AGENT: z.string().optional(),

    RATE_LIMIT_WINDOW_MS: z.string().optional(),
    RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    BODY_SIZE_LIMIT: z.string().optional(),
    URL_ENCODED_BODY_SIZE_LIMIT: z.string().optional(),

    PUPPETEER_HEADLESS: z.string().optional(),

    PADDLE_API_KEY: z.string().optional(),
    PADDLE_WEBHOOK_SECRET: z.string().optional(),
    PADDLE_API_BASE_URL: z.string().optional(),
    PADDLE_WEBHOOK_VERSION: z.string().optional(),
    PADDLE_SOURCE_APP: z.string().optional(),
    PADDLE_PRODUCT_TAG: z.string().optional(),
    PADDLE_PRICE_SOLO: z.string().optional(),
    PADDLE_PRICE_FIRM_STARTER: z.string().optional(),
    PADDLE_PRICE_FIRM_GROWTH: z.string().optional(),
    PADDLE_PRICE_FIRM_SCALE: z.string().optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_SECURE: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_USERNAME: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().email().optional(),
    SMTP_FROM_EMAIL: z.string().email().optional(),
    SMTP_FROM_NAME: z.string().optional(),
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.string().optional(),
    EMAIL_SECURE: z.string().optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.FRONTEND_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FRONTEND_URL is required when NODE_ENV is production',
          path: ['FRONTEND_URL'],
        });
      }
    }
  });

export type EnvVars = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const detail = JSON.stringify(
      { fieldErrors: flat.fieldErrors, formErrors: flat.formErrors },
      null,
      0,
    );
    throw new Error(`Invalid environment configuration: ${detail}`);
  }
  return parsed.data as unknown as Record<string, unknown>;
}
