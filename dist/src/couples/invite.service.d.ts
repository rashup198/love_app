import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class InviteService {
    private readonly prisma;
    private readonly redis;
    private readonly INVITE_EXPIRY_HOURS;
    constructor(prisma: PrismaService, redis: RedisService);
    createInvite(senderId: string): Promise<{
        inviteCode: string;
        expiresAt: Date;
    }>;
    acceptInvite(receiverId: string, inviteCode: string): Promise<{
        coupleId: string;
        partnerId: string;
    }>;
    cancelInvite(senderId: string, inviteCode: string): Promise<{
        cancelled: boolean;
    }>;
}
