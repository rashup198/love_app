import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MoodLevel } from '@prisma/client';

export class LogMoodDto {
  @IsEnum(MoodLevel)
  mood: MoodLevel;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
