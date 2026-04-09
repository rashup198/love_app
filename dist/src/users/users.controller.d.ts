import { UsersService } from './users.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: JwtPayload): Promise<{
        id: string;
        email: string;
        isOnboarded: boolean;
        lastActiveAt: Date | null;
        profile: {
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
        } | null;
        subscription: {
            tier: import(".prisma/client").$Enums.SubscriptionTier;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            expiresAt: Date;
        } | null;
    }>;
    updateProfile(user: JwtPayload, dto: UpdateProfileDto): Promise<{
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
    deactivateAccount(user: JwtPayload): Promise<{
        deactivated: boolean;
    }>;
}
