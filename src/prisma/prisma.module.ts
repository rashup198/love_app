import { Global, Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}
