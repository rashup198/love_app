import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';
export declare class DailyQuestionService {
    private readonly prisma;
    private readonly contentService;
    private readonly logger;
    constructor(prisma: PrismaService, contentService: ContentService);
    getTodaysQuestion(coupleId: string): Promise<{
        question: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isActive: boolean;
            tier: import(".prisma/client").$Enums.ContentTier;
            text: string;
            category: import(".prisma/client").$Enums.QuestionCategory;
            sortOrder: number;
            usageCount: number;
            avgRating: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DailyQuestionStatus;
        coupleId: string;
        questionId: string;
        assignedDate: Date;
        userAAnsweredAt: Date | null;
        userBAnsweredAt: Date | null;
        revealedAt: Date | null;
    }>;
    assignDailyQuestion(coupleId: string, date: Date): Promise<{
        question: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            isActive: boolean;
            tier: import(".prisma/client").$Enums.ContentTier;
            text: string;
            category: import(".prisma/client").$Enums.QuestionCategory;
            sortOrder: number;
            usageCount: number;
            avgRating: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DailyQuestionStatus;
        coupleId: string;
        questionId: string;
        assignedDate: Date;
        userAAnsweredAt: Date | null;
        userBAnsweredAt: Date | null;
        revealedAt: Date | null;
    }>;
    assignDailyQuestionsForAllCouples(): Promise<{
        assigned: number;
    }>;
    getQuestionHistory(coupleId: string, page?: number, limit?: number): Promise<{
        items: ({
            question: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                isActive: boolean;
                tier: import(".prisma/client").$Enums.ContentTier;
                text: string;
                category: import(".prisma/client").$Enums.QuestionCategory;
                sortOrder: number;
                usageCount: number;
                avgRating: number;
            };
            answers: ({
                user: {
                    profile: {
                        displayName: string;
                    } | null;
                    id: string;
                    email: string;
                };
                reactions: {
                    type: import(".prisma/client").$Enums.ReactionType;
                    id: string;
                    createdAt: Date;
                    userId: string;
                    answerId: string;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                coupleId: string;
                text: string;
                dailyQuestionId: string;
                isRevealed: boolean;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.DailyQuestionStatus;
            coupleId: string;
            questionId: string;
            assignedDate: Date;
            userAAnsweredAt: Date | null;
            userBAnsweredAt: Date | null;
            revealedAt: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
