import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { RedactingLogger } from './common/logging';
import { AppModule } from './app.module';

function parseCommaSeparatedList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIntWithDefault(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function bootstrap() {
  const bootstrapLogger = new RedactingLogger('Bootstrap');
  Logger.overrideLogger(bootstrapLogger);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: bootstrapLogger,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3889;
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const frontendUrl = config.get<string>('FRONTEND_URL');
  const corsOrigins = parseCommaSeparatedList(
    config.get<string>('CORS_ALLOWED_ORIGINS'),
  );

  const bodySizeLimit = config.get<string>('BODY_SIZE_LIMIT') ?? '1mb';
  const urlencodedBodySizeLimit =
    config.get<string>('URL_ENCODED_BODY_SIZE_LIMIT') ?? '1mb';
  const rateLimitWindowMs = parseIntWithDefault(
    config.get<string>('RATE_LIMIT_WINDOW_MS'),
    15 * 60 * 1000,
  );
  const rateLimitMaxRequests = parseIntWithDefault(
    config.get<string>('RATE_LIMIT_MAX_REQUESTS'),
    300,
  );

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(json({ limit: bodySizeLimit }));
  app.use(urlencoded({ extended: true, limit: urlencodedBodySizeLimit }));
  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      max: rateLimitMaxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later.' },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? [...new Set([frontendUrl, ...corsOrigins].filter(Boolean))]
        : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key',
    ],
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const host = '0.0.0.0'; // Listen on all network interfaces

  bootstrapLogger.log('='.repeat(60));
  bootstrapLogger.log('VIDHIGYA BACKEND SERVER STARTING');
  bootstrapLogger.log('='.repeat(60));
  bootstrapLogger.log(`Host: ${host}`);
  bootstrapLogger.log(`Port: ${port}`);
  bootstrapLogger.log(`URL: http://localhost:${port}`);
  bootstrapLogger.log(`API URL: http://localhost:${port}/api`);
  bootstrapLogger.log(`Environment: ${nodeEnv}`);
  bootstrapLogger.log(
    `JWT secret configured: ${config.get<string>('JWT_SECRET') ? 'yes' : 'no'}`,
  );
  bootstrapLogger.log(
    `Database URL configured: ${config.get<string>('DATABASE_URL') ? 'yes' : 'no'}`,
  );
  bootstrapLogger.log('='.repeat(60));

  // Start the application
  await app.listen(port, host);
  bootstrapLogger.log(`Application is running on: http://localhost:${port}`);
  bootstrapLogger.log(`API: http://localhost:${port}/api`);
}
void bootstrap();
