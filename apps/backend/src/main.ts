import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { RedactingLogger } from './common/logging';
import { AppModule } from './app.module';

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

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: nodeEnv === 'production' && frontendUrl ? [frontendUrl] : true,
    credentials: true,
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
