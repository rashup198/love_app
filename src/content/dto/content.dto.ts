import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { QuestionCategory, ContentTier } from '@prisma/client';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;

  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @IsEnum(ContentTier)
  @IsOptional()
  tier?: ContentTier;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}

export class GetQuestionsDto {
  @IsEnum(QuestionCategory)
  @IsOptional()
  category?: QuestionCategory;

  @IsEnum(ContentTier)
  @IsOptional()
  tier?: ContentTier;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;
}

class BulkQuestionItem {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;

  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @IsEnum(ContentTier)
  @IsOptional()
  tier?: ContentTier;
}

export class BulkCreateQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkQuestionItem)
  questions: BulkQuestionItem[];
}
