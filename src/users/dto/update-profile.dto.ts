import { IsString, IsOptional, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
