import { MoodLevel } from '@prisma/client';
export declare class LogMoodDto {
    mood: MoodLevel;
    note?: string;
}
