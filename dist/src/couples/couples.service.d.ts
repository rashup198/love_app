import { PrismaService } from '../prisma/prisma.service';
export declare class CouplesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    joinCouple(inviteCode: string, userId: string): Promise<{
        coupleId: string;
        partnerId: string;
        status: import(".prisma/client").$Enums.CoupleStatus;
        currentStreak: number;
        createdAt: Date;
    }>;
    getCouple(userId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CoupleStatus;
        partner: {
            id: string;
            displayName: string | null;
            avatarUrl: string | null;
        };
        relationshipStartDate: Date | null;
        currentStreak: number;
        longestStreak: number;
        totalInteractions: number;
        createdAt: Date;
    }>;
    getCoupleId(userId: string): Promise<string | null>;
    getPartnerId(userId: string): Promise<string | null>;
    updateRelationshipDate(userId: string, startDate: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.CoupleStatus;
        relationshipStartDate: Date | null;
        currentStreak: number;
        longestStreak: number;
        lastInteractionDate: Date | null;
        totalInteractions: number;
        userAId: string;
        userBId: string;
    }>;
    dissolveCouple(userId: string): Promise<{
        dissolved: boolean;
    }>;
}
