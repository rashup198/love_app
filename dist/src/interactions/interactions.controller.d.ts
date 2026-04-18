import { AnswerService } from './answer.service';
import { ReactionService } from './reaction.service';
import { MessageService } from './message.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { SubmitAnswerDto, AddReactionDto, SendMessageDto } from './dto/interactions.dto';
export declare class InteractionsController {
    private readonly answerService;
    private readonly reactionService;
    private readonly messageService;
    constructor(answerService: AnswerService, reactionService: ReactionService, messageService: MessageService);
    submitAnswer(user: JwtPayload, dto: SubmitAnswerDto): Promise<import("./answer.service").AnswerResult>;
    revealAnswers(user: JwtPayload, dailyQuestionId: string): Promise<{
        answers: {
            id: string;
            userId: string;
            text: string;
            createdAt: Date;
        }[];
    }>;
    addReaction(user: JwtPayload, dto: AddReactionDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        answerId: string;
        type: import(".prisma/client").$Enums.ReactionType;
    }>;
    removeReaction(user: JwtPayload, answerId: string): Promise<{
        removed: boolean;
    }>;
    sendMessage(user: JwtPayload, dto: SendMessageDto): Promise<{
        id: string;
        coupleId: string;
        createdAt: Date;
        deletedAt: Date | null;
        type: import(".prisma/client").$Enums.MessageType;
        content: string;
        isRead: boolean;
        readAt: Date | null;
        senderId: string;
    }>;
    getMessages(coupleId: string, page?: string, limit?: string): Promise<{
        items: ({
            sender: {
                id: string;
                profile: {
                    displayName: string;
                    avatarUrl: string | null;
                } | null;
            };
        } & {
            id: string;
            coupleId: string;
            createdAt: Date;
            deletedAt: Date | null;
            type: import(".prisma/client").$Enums.MessageType;
            content: string;
            isRead: boolean;
            readAt: Date | null;
            senderId: string;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    markAsRead(user: JwtPayload, coupleId: string): Promise<{
        markedRead: number;
    }>;
    deleteMessage(user: JwtPayload, id: string): Promise<{
        deleted: boolean;
    }>;
}
