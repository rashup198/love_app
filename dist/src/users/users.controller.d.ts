import { UsersService } from './users.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: JwtPayload): Promise<{
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
