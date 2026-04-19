import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';

@Injectable()
export class RateLimiterService implements OnModuleInit, OnModuleDestroy {
  private rateLimiter: RateLimiterMemory | RateLimiterRedis | null = null;
  private redisClient: any = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.close();
  }

  async initialize(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

      if (redisUrl) {
        // Use Redis-based rate limiter
        this.redisClient = createClient({
          url: redisUrl,
          password: redisPassword || undefined,
        });

        await this.redisClient.connect();

        const maxRequests = this.configService.get<number>(
          'RATE_LIMIT_MAX_REQUESTS',
          100,
        );
        const windowMs = this.configService.get<number>(
          'RATE_LIMIT_WINDOW_MS',
          60000,
        );

        this.rateLimiter = new RateLimiterRedis({
          storeClient: this.redisClient,
          keyPrefix: 'ecourts_rate_limit',
          points: maxRequests,
          duration: Math.floor(windowMs / 1000),
          blockDuration: 60, // Block for 1 minute if limit exceeded
        });
      } else {
        // Use memory-based rate limiter
        const maxRequests = this.configService.get<number>(
          'RATE_LIMIT_MAX_REQUESTS',
          100,
        );
        const windowMs = this.configService.get<number>(
          'RATE_LIMIT_WINDOW_MS',
          60000,
        );

        this.rateLimiter = new RateLimiterMemory({
          keyPrefix: 'ecourts_rate_limit',
          points: maxRequests,
          duration: Math.floor(windowMs / 1000),
          blockDuration: 60,
        });
      }
    } catch (error) {
      console.error('Failed to initialize rate limiter:', error);
      // Fallback to memory-based rate limiter
      const maxRequests = this.configService.get<number>(
        'RATE_LIMIT_MAX_REQUESTS',
        100,
      );
      const windowMs = this.configService.get<number>(
        'RATE_LIMIT_WINDOW_MS',
        60000,
      );

      this.rateLimiter = new RateLimiterMemory({
        keyPrefix: 'ecourts_rate_limit',
        points: maxRequests,
        duration: Math.floor(windowMs / 1000),
        blockDuration: 60,
      });
    }
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remainingPoints: number;
    msBeforeNext: number;
  }> {
    if (!this.rateLimiter) {
      await this.initialize();
    }

    try {
      const result = await this.rateLimiter.consume(identifier);
      return {
        allowed: true,
        remainingPoints: result.remainingPoints,
        msBeforeNext: result.msBeforeNext,
      };
    } catch (rejRes) {
      const result = rejRes;
      return {
        allowed: false,
        remainingPoints: 0,
        msBeforeNext: result.msBeforeNext,
      };
    }
  }

  async getRemainingPoints(identifier: string): Promise<number> {
    if (!this.rateLimiter) {
      await this.initialize();
    }

    try {
      const result = await this.rateLimiter.get(identifier);
      const maxRequests = this.configService.get<number>(
        'RATE_LIMIT_MAX_REQUESTS',
        100,
      );
      return result ? result.remainingPoints : maxRequests;
    } catch (error) {
      console.error('Failed to get remaining points:', error);
      const maxRequests = this.configService.get<number>(
        'RATE_LIMIT_MAX_REQUESTS',
        100,
      );
      return maxRequests;
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    if (!this.rateLimiter) {
      await this.initialize();
    }

    try {
      await this.rateLimiter.delete(identifier);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.disconnect();
      this.redisClient = null;
    }
  }
}
