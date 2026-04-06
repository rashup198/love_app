import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MoodLevel } from '@prisma/client';
export declare class MoodService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    logMood(userId: string, mood: MoodLevel, note?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        mood: import(".prisma/client").$Enums.MoodLevel;
        note: string | null;
        date: Date;
    }>;
    getMoodHistory(userId: string, days?: number): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            userId: string;
            mood: import(".prisma/client").$Enums.MoodLevel;
            note: string | null;
            date: Date;
        }[];
        totalDays: number;
        loggedDays: number;
    }>;
    getTodaysMood(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        mood: import(".prisma/client").$Enums.MoodLevel;
        note: string | null;
        date: Date;
    } | null>;
    getPartnerMood(partnerId: string): Promise<{
        mood: import(".prisma/client").$Enums.MoodLevel;
        date: Date;
    } | null>;
}
