import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ReactionType } from '@prisma/client';
export declare class ReactionService {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    addReaction(userId: string, answerId: string, type: ReactionType): Promise<{
        type: import(".prisma/client").$Enums.ReactionType;
        id: string;
        createdAt: Date;
        userId: string;
        answerId: string;
    }>;
    removeReaction(userId: string, answerId: string): Promise<{
        removed: boolean;
    }>;
}
