import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient {
    private readonly logger;
    constructor();
    cleanDatabase(): Promise<any[] | undefined>;
}
