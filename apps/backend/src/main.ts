import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 3001;
  const host = '0.0.0.0'; // Listen on all network interfaces

  console.log('='.repeat(60));
  console.log('🚀 VIDHIGYA BACKEND SERVER STARTING');
  console.log('='.repeat(60));
  console.log(`📍 Host: ${host}`);
  console.log(`🔌 Port: ${port}`);
  console.log(`🌐 URL: http://localhost:${port}`);
  console.log(`📚 API URL: http://localhost:${port}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔑 JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`,
  );
  console.log(
    `📊 Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`,
  );
  console.log('='.repeat(60));

  // Start the application
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}
bootstrap();
