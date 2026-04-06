import { IsString, IsNotEmpty, IsDateString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class JoinCoupleDto {
  @IsString({ message: 'Invite code must be a string' })
  @IsNotEmpty({ message: 'Invite code is required' })
  @Length(6, 8, { message: 'Invite code must be between 6 and 8 characters' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Invite code must be uppercase alphanumeric' })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  inviteCode: string;
}

export class UpdateRelationshipDto {
  @IsDateString({}, { message: 'Must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;
}
