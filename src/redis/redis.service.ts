import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  readonly publisher: Redis;
  readonly subscriber: Redis;

  constructor(private readonly options: RedisOptions) {
    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);

    this.publisher.on('connect', () => this.logger.log('Redis publisher connected'));
    this.publisher.on('error', (err) => this.logger.error('Redis publisher error', err.message));

    this.subscriber.on('connect', () => this.logger.log('Redis subscriber connected'));
    this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err.message));
  }

  async onModuleDestroy() {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }

  async get(key: string): Promise<string | null> {
    return this.publisher.get(key);
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    return this.publisher.set(key, value, ...args);
  }

  async del(...keys: string[]): Promise<number> {
    return this.publisher.del(...keys);
  }

  async incr(key: string): Promise<number> {
    return this.publisher.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.publisher.expire(key, seconds);
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.publisher.set(key, value, 'EX', ttlSeconds);
  }

  async getAndDelete(key: string): Promise<string | null> {
    const value = await this.publisher.get(key);
    if (value !== null) {
      await this.publisher.del(key);
    }
    return value;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.publisher.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.publisher.set(key, serialized);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.publisher.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  async subscribe(
    pattern: string,
    handler: (channel: string, message: string) => void,
  ): Promise<void> {
    await this.subscriber.psubscribe(pattern);
    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      handler(channel, message);
    });
    this.logger.log(`Subscribed to Redis pattern: ${pattern}`);
  }

  async publishEvent(channel: string, payload: Record<string, any>): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }
}
