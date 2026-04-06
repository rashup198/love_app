import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      useFactory: (config: ConfigService) => {
        return new RedisService({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', ''),
          db: config.get<number>('REDIS_DB', 0),
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => {
            const logger = new Logger('RedisModule');
            if (times > 10) {
              logger.error('Redis max retries reached');
              return null;
            }
            return Math.min(times * 200, 5000);
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
