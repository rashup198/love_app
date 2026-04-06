import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ReactionType, MessageType } from '@prisma/client';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  dailyQuestionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  answerId: string;

  @IsEnum(ReactionType)
  type: ReactionType;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  coupleId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;
}
