import { ContentService } from './content.service';
import { DailyQuestionService } from './daily-question.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateQuestionDto, GetQuestionsDto, BulkCreateQuestionsDto } from './dto/content.dto';
export declare class ContentController {
    private readonly contentService;
    private readonly dailyQuestionService;
    constructor(contentService: ContentService, dailyQuestionService: DailyQuestionService);
    getQuestions(query: GetQuestionsDto): Promise<{
        items: {
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
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createQuestion(dto: CreateQuestionDto): Promise<{
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
    }>;
    bulkCreateQuestions(dto: BulkCreateQuestionsDto): Promise<{
        created: number;
    }>;
    getTodaysQuestion(user: JwtPayload): Promise<{
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
    getQuestionHistory(user: JwtPayload, page?: string, limit?: string): Promise<{
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
