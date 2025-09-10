import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

      if (redisUrl) {
        this.client = createClient({
          url: redisUrl,
          password: redisPassword || undefined,
        });

        this.client.on('error', (err) => {
          console.error('Redis Client Error:', err);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('Connected to Redis');
          this.isConnected = true;
        });

        await this.client.connect();
      } else {
        console.log('Redis not configured, using memory cache');
        this.isConnected = true;
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = true; // Fallback to memory cache
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    this.memoryCache.clear();
    this.isConnected = false;
  }

  private generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  private isExpired(expires: number): boolean {
    return Date.now() > expires;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.client && this.isConnected) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to memory cache
        const cached = this.memoryCache.get(key);
        if (cached && !this.isExpired(cached.expires)) {
          return cached.data;
        }
        if (cached) {
          this.memoryCache.delete(key);
        }
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl =
        ttlSeconds || this.configService.get<number>('CACHE_TTL_SECONDS', 3600);

      if (this.client && this.isConnected) {
        await this.client.setEx(key, ttl, JSON.stringify(value));
      } else {
        // Fallback to memory cache
        const expires = Date.now() + ttl * 1000;
        this.memoryCache.set(key, { data: value, expires });

        // Clean up expired entries periodically
        const maxSize = this.configService.get<number>('CACHE_MAX_SIZE', 1000);
        if (this.memoryCache.size > maxSize) {
          this.cleanupMemoryCache();
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.client && this.isConnected) {
        const result = await this.client.exists(key);
        return result === 1;
      } else {
        const cached = this.memoryCache.get(key);
        return cached ? !this.isExpired(cached.expires) : false;
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.flushAll();
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (this.isExpired(value.expires)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Cache key generators
  generateCaseKey(caseNumber: string, courtId?: string): string {
    return this.generateKey('case', caseNumber, courtId || 'default');
  }

  generateCourtKey(courtId: string): string {
    return this.generateKey('court', courtId);
  }

  generateJudgeKey(judgeId: string): string {
    return this.generateKey('judge', judgeId);
  }

  generateSearchKey(
    type: string,
    query: string,
    filters?: Record<string, any>,
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return this.generateKey('search', type, query, filterStr);
  }

  generateHearingsKey(caseNumber: string): string {
    return this.generateKey('hearings', caseNumber);
  }

  generateOrdersKey(caseNumber: string): string {
    return this.generateKey('orders', caseNumber);
  }
}
