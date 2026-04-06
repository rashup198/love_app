import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from './prisma.service';
export declare class PrismaModule implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
