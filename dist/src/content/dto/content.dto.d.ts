import { QuestionCategory, ContentTier } from '@prisma/client';
export declare class CreateQuestionDto {
    text: string;
    category: QuestionCategory;
    tier?: ContentTier;
    sortOrder?: number;
}
export declare class GetQuestionsDto {
    category?: QuestionCategory;
    tier?: ContentTier;
    page?: number;
    limit?: number;
}
declare class BulkQuestionItem {
    text: string;
    category: QuestionCategory;
    tier?: ContentTier;
}
export declare class BulkCreateQuestionsDto {
    questions: BulkQuestionItem[];
}
export {};
