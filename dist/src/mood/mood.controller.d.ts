import { MoodService } from './mood.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { LogMoodDto } from './dto/mood.dto';
export declare class MoodController {
    private readonly moodService;
    constructor(moodService: MoodService);
    logMood(user: JwtPayload, dto: LogMoodDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        mood: import(".prisma/client").$Enums.MoodLevel;
        note: string | null;
        date: Date;
    }>;
    getTodaysMood(user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        mood: import(".prisma/client").$Enums.MoodLevel;
        note: string | null;
        date: Date;
    } | null>;
    getMoodHistory(user: JwtPayload, days?: string): Promise<{
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
    getPartnerMood(user: JwtPayload, partnerId: string): Promise<{
        mood: import(".prisma/client").$Enums.MoodLevel;
        date: Date;
    } | null>;
}
