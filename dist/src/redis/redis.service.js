"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    constructor(options) {
        this.options = options;
        this.logger = new common_1.Logger(RedisService_1.name);
        this.publisher = new ioredis_1.default(options);
        this.subscriber = new ioredis_1.default(options);
        this.publisher.on('connect', () => this.logger.log('Redis publisher connected'));
        this.publisher.on('error', (err) => this.logger.error('Redis publisher error', err.message));
        this.subscriber.on('connect', () => this.logger.log('Redis subscriber connected'));
        this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err.message));
    }
    async onModuleDestroy() {
        await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
    }
    async get(key) {
        return this.publisher.get(key);
    }
    async set(key, value, ...args) {
        return this.publisher.set(key, value, ...args);
    }
    async del(...keys) {
        return this.publisher.del(...keys);
    }
    async incr(key) {
        return this.publisher.incr(key);
    }
    async expire(key, seconds) {
        return this.publisher.expire(key, seconds);
    }
    async setWithExpiry(key, value, ttlSeconds) {
        await this.publisher.set(key, value, 'EX', ttlSeconds);
    }
    async getAndDelete(key) {
        const value = await this.publisher.get(key);
        if (value !== null) {
            await this.publisher.del(key);
        }
        return value;
    }
    async setJson(key, value, ttlSeconds) {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
            await this.publisher.set(key, serialized, 'EX', ttlSeconds);
        }
        else {
            await this.publisher.set(key, serialized);
        }
    }
    async getJson(key) {
        const value = await this.publisher.get(key);
        if (value === null)
            return null;
        return JSON.parse(value);
    }
    async publish(channel, message) {
        return this.publisher.publish(channel, message);
    }
    async subscribe(pattern, handler) {
        await this.subscriber.psubscribe(pattern);
        this.subscriber.on('pmessage', (_pattern, channel, message) => {
            handler(channel, message);
        });
        this.logger.log(`Subscribed to Redis pattern: ${pattern}`);
    }
    async publishEvent(channel, payload) {
        await this.publisher.publish(channel, JSON.stringify(payload));
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], RedisService);
//# sourceMappingURL=redis.service.js.map