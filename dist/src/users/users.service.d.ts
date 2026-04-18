import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            isOnboarded: boolean;
            coupleId: string | null;
            inviteCode: string | null;
        };
        couple: {
            id: string;
            status: import(".prisma/client").$Enums.CoupleStatus;
            partner: {
                id: string;
                displayName: string | null;
                avatarUrl: string | null;
            };
            currentStreak: number;
            longestStreak: number;
            totalInteractions: number;
            createdAt: Date;
        } | null;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        displayName: string;
        avatarUrl: string | null;
        dateOfBirth: Date | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        bio: string | null;
        timezone: string;
        userId: string;
    }>;
    deactivateAccount(userId: string): Promise<{
        deactivated: boolean;
    }>;
    updateLastActive(userId: string): Promise<void>;
}
