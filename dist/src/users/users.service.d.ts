import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        isOnboarded: boolean;
        isEmailVerified: boolean;
        lastActiveAt: Date | null;
        profile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            displayName: string;
            avatarUrl: string | null;
            dateOfBirth: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            bio: string | null;
            timezone: string;
        } | null;
        subscription: {
            tier: import(".prisma/client").$Enums.SubscriptionTier;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            expiresAt: Date;
        } | null;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        dateOfBirth: Date | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        bio: string | null;
        timezone: string;
    }>;
    deactivateAccount(userId: string): Promise<{
        deactivated: boolean;
    }>;
    updateLastActive(userId: string): Promise<void>;
}
