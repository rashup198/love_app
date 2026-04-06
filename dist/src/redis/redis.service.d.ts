import { OnModuleDestroy } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
export declare class RedisService implements OnModuleDestroy {
    private readonly options;
    private readonly logger;
    readonly publisher: Redis;
    readonly subscriber: Redis;
    constructor(options: RedisOptions);
    onModuleDestroy(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void>;
    getAndDelete(key: string): Promise<string | null>;
    setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    getJson<T>(key: string): Promise<T | null>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(pattern: string, handler: (channel: string, message: string) => void): Promise<void>;
    publishEvent(channel: string, payload: Record<string, any>): Promise<void>;
}
