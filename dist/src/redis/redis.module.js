"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("./redis.service");
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: redis_service_1.RedisService,
                useFactory: (config) => {
                    return new redis_service_1.RedisService({
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                        password: config.get('REDIS_PASSWORD', ''),
                        db: config.get('REDIS_DB', 0),
                        maxRetriesPerRequest: null,
                        retryStrategy: (times) => {
                            const logger = new common_1.Logger('RedisModule');
                            if (times > 10) {
                                logger.error('Redis max retries reached');
                                return null;
                            }
                            return Math.min(times * 200, 5000);
                        },
                    });
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [redis_service_1.RedisService],
    })
], RedisModule);
//# sourceMappingURL=redis.module.js.map