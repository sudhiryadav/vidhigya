import { Injectable } from '@nestjs/common';
import { UserPermissions } from './permission.types';

@Injectable()
export class PermissionCacheService {
  private cache = new Map<
    string,
    { data: UserPermissions; timestamp: number }
  >();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Get user permissions from cache
   */
  async get(userId: string): Promise<UserPermissions | null> {
    const cacheKey = `permissions:${userId}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Set user permissions in cache
   */
  async set(userId: string, permissions: UserPermissions): Promise<void> {
    const cacheKey = `permissions:${userId}`;
    this.cache.set(cacheKey, {
      data: permissions,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove user permissions from cache
   */
  async delete(userId: string): Promise<void> {
    const cacheKey = `permissions:${userId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all permissions cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Invalidate cache for users in a specific practice
   */
  async invalidatePracticeUsers(practiceId: string): Promise<void> {
    // Get all cache keys and check which users belong to this practice
    const keysToDelete: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith('permissions:')) {
        // Check if user has access to this practice
        const userPermissions = value.data;
        const hasAccess =
          userPermissions.role === 'SUPER_ADMIN' ||
          userPermissions.inheritedPermissions.some(
            (p) => p.resource === 'PRACTICE' && p.scope === 'PRACTICE',
          );

        if (hasAccess) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    averageAge: number;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    const totalAge = entries.reduce((sum, [, value]) => {
      return sum + (now - value.timestamp);
    }, 0);

    return {
      size: this.cache.size,
      keys: entries.map(([key]) => key),
      averageAge: entries.length > 0 ? totalAge / entries.length : 0,
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval(): void {
    setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    ); // Cleanup every 5 minutes
  }
}
