import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService,
  ) {
    console.log(
      'AppController initialized with PrismaService:',
      !!this.prismaService,
    );

    // Check if PrismaService is properly injected
    if (!this.prismaService) {
      console.warn('WARNING: PrismaService not injected into AppController');
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping')
  getPing() {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  async getHealth() {
    console.log('Health check requested');

    try {
      // Check database connectivity
      if (this.prismaService) {
        console.log('PrismaService available, checking database connection...');

        try {
          await this.prismaService.$queryRaw`SELECT 1`;
          console.log('Database connection successful');

          return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            database: 'connected',
            services: {
              prisma: 'healthy',
              api: 'healthy',
            },
          };
        } catch (dbError) {
          console.error('Database connection failed:', dbError);
          return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            database: 'disconnected',
            error: dbError.message,
            services: {
              prisma: 'unhealthy',
              api: 'healthy',
            },
          };
        }
      } else {
        console.log('PrismaService not available');
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          database: 'unknown',
          services: {
            prisma: 'unknown',
            api: 'healthy',
          },
        };
      }
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: 'disconnected',
        error: error.message,
        services: {
          prisma: 'unhealthy',
          api: 'healthy',
        },
      };
    }
  }

  @Get('health/simple')
  getSimpleHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      message: 'API is running',
    };
  }

  @Get('info')
  getInfo() {
    return {
      name: 'Vidhigya Backend API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  }
}
