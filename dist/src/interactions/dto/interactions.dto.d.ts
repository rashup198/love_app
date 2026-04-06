import { ReactionType, MessageType } from '@prisma/client';
export declare class SubmitAnswerDto {
    dailyQuestionId: string;
    text: string;
}
export declare class AddReactionDto {
    answerId: string;
    type: ReactionType;
}
export declare class SendMessageDto {
    coupleId: string;
    content: string;
    type?: MessageType;
}
