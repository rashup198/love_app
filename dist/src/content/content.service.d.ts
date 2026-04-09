import { PrismaService } from '../prisma/prisma.service';
import { QuestionCategory, ContentTier } from '@prisma/client';
export declare class ContentService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getQuestions(filters: {
        category?: QuestionCategory;
        tier?: ContentTier;
        page?: number;
        limit?: number;
    }): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tier: import(".prisma/client").$Enums.ContentTier;
            isActive: boolean;
            text: string;
            category: import(".prisma/client").$Enums.QuestionCategory;
            sortOrder: number;
            usageCount: number;
            avgRating: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createQuestion(data: {
        text: string;
        category: QuestionCategory;
        tier?: ContentTier;
        sortOrder?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tier: import(".prisma/client").$Enums.ContentTier;
        isActive: boolean;
        text: string;
        category: import(".prisma/client").$Enums.QuestionCategory;
        sortOrder: number;
        usageCount: number;
        avgRating: number;
    }>;
    bulkCreateQuestions(questions: Array<{
        text: string;
        category: QuestionCategory;
        tier?: ContentTier;
    }>): Promise<{
        created: number;
    }>;
    selectQuestionForCouple(coupleId: string, tier?: ContentTier): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tier: import(".prisma/client").$Enums.ContentTier;
        isActive: boolean;
        text: string;
        category: import(".prisma/client").$Enums.QuestionCategory;
        sortOrder: number;
        usageCount: number;
        avgRating: number;
    } | null>;
    getDailyQuestion(userId: string): Promise<{
        status: string;
        message: string;
        question: null;
        dailyQuestionId?: undefined;
        assignedDate?: undefined;
        questionStatus?: undefined;
        currentUser?: undefined;
        partner?: undefined;
        isRevealed?: undefined;
        answers?: undefined;
    } | {
        status: string;
        dailyQuestionId: string;
        assignedDate: Date;
        questionStatus: import(".prisma/client").$Enums.DailyQuestionStatus;
        question: {
            id: string;
            text: string;
            category: import(".prisma/client").$Enums.QuestionCategory;
        };
        currentUser: {
            hasAnswered: boolean;
            answerId: string | null;
        };
        partner: {
            hasAnswered: boolean;
        };
        isRevealed: boolean;
        answers: {
            id: string;
            userId: string;
            text: string;
            createdAt: Date;
        }[];
        message?: undefined;
    }>;
    private assignDailyQuestion;
    private getUtcDateNormalized;
}
