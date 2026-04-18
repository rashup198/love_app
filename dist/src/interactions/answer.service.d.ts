import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { StreakService } from '../couples/streak.service';
export interface AnswerResult {
    status: 'WAITING_FOR_PARTNER' | 'REVEALED';
    answerId: string;
    answers?: Array<{
        id: string;
        userId: string;
        text: string;
        createdAt: Date;
    }>;
}
export declare class AnswerService {
    private readonly prisma;
    private readonly eventsGateway;
    private readonly streakService;
    private readonly logger;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway, streakService: StreakService);
    submitAnswer(userId: string, dailyQuestionId: string, text: string): Promise<AnswerResult>;
    revealAnswers(userId: string, dailyQuestionId: string): Promise<{
        answers: {
            id: string;
            userId: string;
            text: string;
            createdAt: Date;
        }[];
    }>;
    private getUtcDateNormalized;
}
