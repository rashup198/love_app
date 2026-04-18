"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const redis_io_adapter_1 = require("./redis/redis-io.adapter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    const config = app.get(config_1.ConfigService);
    const redisIoAdapter = new redis_io_adapter_1.RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(config.get('REDIS_URL'));
    app.useWebSocketAdapter(redisIoAdapter);
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: config.get('CORS_ORIGIN', '*'),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const port = config.get('PORT', 3000);
    await app.listen(port);
    logger.log(`Lovora API running on port ${port}`);
    logger.log(`Environment: ${config.get('NODE_ENV', 'development')}`);
}
bootstrap();
//# sourceMappingURL=main.js.map