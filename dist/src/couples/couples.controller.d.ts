import { CouplesService } from './couples.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { JoinCoupleDto, UpdateRelationshipDto } from './dto/couples.dto';
export declare class CouplesController {
    private readonly couplesService;
    constructor(couplesService: CouplesService);
    getCouple(user: JwtPayload): Promise<{
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
    joinCouple(user: JwtPayload, dto: JoinCoupleDto): Promise<{
        coupleId: string;
        partnerId: string;
        status: import(".prisma/client").$Enums.CoupleStatus;
        currentStreak: number;
        createdAt: Date;
    }>;
    updateRelationshipDate(user: JwtPayload, dto: UpdateRelationshipDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userAId: string;
        userBId: string;
        status: import(".prisma/client").$Enums.CoupleStatus;
        relationshipStartDate: Date | null;
        currentStreak: number;
        longestStreak: number;
        lastInteractionDate: Date | null;
        totalInteractions: number;
    }>;
    dissolveCouple(user: JwtPayload): Promise<{
        dissolved: boolean;
    }>;
}
