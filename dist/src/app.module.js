"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const couples_module_1 = require("./couples/couples.module");
const content_module_1 = require("./content/content.module");
const interactions_module_1 = require("./interactions/interactions.module");
const mood_module_1 = require("./mood/mood.module");
const notifications_module_1 = require("./notifications/notifications.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const events_module_1 = require("./events/events.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
                cache: true,
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => [
                    {
                        ttl: config.get('THROTTLE_TTL', 60) * 1000,
                        limit: config.get('THROTTLE_LIMIT', 60),
                    },
                ],
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            couples_module_1.CouplesModule,
            content_module_1.ContentModule,
            interactions_module_1.InteractionsModule,
            mood_module_1.MoodModule,
            notifications_module_1.NotificationsModule,
            subscriptions_module_1.SubscriptionsModule,
            events_module_1.EventsModule,
        ],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: response_interceptor_1.ResponseInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map