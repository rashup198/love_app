import { PrismaService } from '../prisma/prisma.service';
export declare class StreakService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    recordInteraction(coupleId: string): Promise<void>;
    checkAndResetBrokenStreaks(): Promise<number>;
}
