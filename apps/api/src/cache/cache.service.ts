import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin Redis wrapper used for caching expensive read paths (analytics, etc.).
 *
 * It degrades gracefully: if Redis is unreachable, every method becomes a
 * no-op / cache-miss so the app keeps serving from the database. Caching is a
 * performance optimization, never a hard dependency.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private healthy = false;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL not set — caching disabled');
      return;
    }
    try {
      this.client = new Redis(url, {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
      this.client.on('ready', () => {
        this.healthy = true;
        this.logger.log('Redis cache connected');
      });
      this.client.on('error', (err) => {
        if (this.healthy) this.logger.warn(`Redis error: ${err.message}`);
        this.healthy = false;
      });
      this.client.on('end', () => { this.healthy = false; });
    } catch (err: any) {
      this.logger.warn(`Redis init failed: ${err?.message} — caching disabled`);
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.healthy) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.healthy) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore — cache writes are best-effort
    }
  }

  /** Get from cache, or run `fn`, cache its result, and return it. */
  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /** Delete keys matching a glob pattern (e.g. `analytics:<rid>:*`). */
  async invalidate(pattern: string): Promise<void> {
    if (!this.client || !this.healthy) return;
    try {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];
      for await (const batch of stream) keys.push(...(batch as string[]));
      if (keys.length) await this.client.del(...keys);
    } catch {
      // ignore
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
