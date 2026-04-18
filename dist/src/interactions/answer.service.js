"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnswerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const streak_service_1 = require("../couples/streak.service");
const client_1 = require("@prisma/client");
let AnswerService = AnswerService_1 = class AnswerService {
    constructor(prisma, redis, streakService) {
        this.prisma = prisma;
        this.redis = redis;
        this.streakService = streakService;
        this.logger = new common_1.Logger(AnswerService_1.name);
    }
    async submitAnswer(userId, dailyQuestionId, text) {
        const dailyQuestion = await this.prisma.dailyQuestion.findUnique({
            where: { id: dailyQuestionId },
            include: {
                couple: {
                    select: { id: true, userAId: true, userBId: true, status: true, deletedAt: true },
                },
            },
        });
        if (!dailyQuestion) {
            throw new common_1.NotFoundException('Daily question not found');
        }
        const couple = dailyQuestion.couple;
        if (!couple || couple.deletedAt || couple.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Couple is not active');
        }
        const isUserA = couple.userAId === userId;
        const isUserB = couple.userBId === userId;
        if (!isUserA && !isUserB) {
            throw new common_1.ForbiddenException('You are not part of this couple');
        }
        const today = this.getUtcDateNormalized();
        const assignedDate = new Date(dailyQuestion.assignedDate);
        assignedDate.setUTCHours(0, 0, 0, 0);
        if (assignedDate.getTime() !== today.getTime()) {
            throw new common_1.BadRequestException('This question is not for today');
        }
        if (dailyQuestion.status === client_1.DailyQuestionStatus.EXPIRED) {
            throw new common_1.BadRequestException('This question has expired');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const existingAnswer = await tx.answer.findUnique({
                where: { dailyQuestionId_userId: { dailyQuestionId, userId } },
                select: { id: true },
            });
            if (existingAnswer) {
                throw new common_1.BadRequestException('You have already answered this question');
            }
            const answer = await tx.answer.create({
                data: {
                    dailyQuestionId,
                    coupleId: couple.id,
                    userId,
                    text: text.trim(),
                },
            });
            const allAnswers = await tx.answer.findMany({
                where: { dailyQuestionId },
                select: {
                    id: true,
                    userId: true,
                    text: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            });
            const bothAnswered = allAnswers.length >= 2;
            const updateData = {};
            if (isUserA) {
                updateData.userAAnsweredAt = new Date();
            }
            else {
                updateData.userBAnsweredAt = new Date();
            }
            if (bothAnswered) {
                updateData.status = client_1.DailyQuestionStatus.COMPLETED;
            }
            else {
                updateData.status = client_1.DailyQuestionStatus.PARTIALLY_ANSWERED;
            }
            await tx.dailyQuestion.update({
                where: { id: dailyQuestionId },
                data: updateData,
            });
            return { answer, allAnswers, bothAnswered };
        });
        const partnerId = isUserA ? couple.userBId : couple.userAId;
        await this.redis.publish(`couple_${couple.id}`, JSON.stringify({
            type: 'PARTNER_ANSWERED',
            questionId: dailyQuestionId,
            userId,
            partnerId,
            bothAnswered: result.bothAnswered,
            answers: result.bothAnswered ? result.allAnswers.map((a) => ({
                id: a.id,
                userId: a.userId,
                text: a.text,
                createdAt: a.createdAt,
            })) : undefined,
            timestamp: Date.now(),
        }));
        if (result.bothAnswered) {
            this.streakService.recordInteraction(couple.id).catch((err) => {
                this.logger.error(`Failed to record streak for couple ${couple.id}`, err);
            });
            return {
                status: 'REVEALED',
                answerId: result.answer.id,
                answers: result.allAnswers.map((a) => ({
                    id: a.id,
                    userId: a.userId,
                    text: a.text,
                    createdAt: a.createdAt,
                })),
            };
        }
        return {
            status: 'WAITING_FOR_PARTNER',
            answerId: result.answer.id,
        };
    }
    async revealAnswers(userId, dailyQuestionId) {
        const dailyQuestion = await this.prisma.dailyQuestion.findUnique({
            where: { id: dailyQuestionId },
            include: {
                couple: { select: { id: true, userAId: true, userBId: true } },
                answers: {
                    select: {
                        id: true,
                        userId: true,
                        text: true,
                        isRevealed: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!dailyQuestion) {
            throw new common_1.NotFoundException('Daily question not found');
        }
        const couple = dailyQuestion.couple;
        if (couple.userAId !== userId && couple.userBId !== userId) {
            throw new common_1.ForbiddenException('You are not part of this couple');
        }
        if (dailyQuestion.status !== client_1.DailyQuestionStatus.COMPLETED &&
            dailyQuestion.status !== client_1.DailyQuestionStatus.REVEALED) {
            throw new common_1.BadRequestException('Both partners must answer before revealing');
        }
        if (dailyQuestion.status === client_1.DailyQuestionStatus.REVEALED) {
            return {
                answers: dailyQuestion.answers.map((a) => ({
                    id: a.id,
                    userId: a.userId,
                    text: a.text,
                    createdAt: a.createdAt,
                })),
            };
        }
        await this.prisma.$transaction([
            this.prisma.dailyQuestion.update({
                where: { id: dailyQuestionId },
                data: { status: client_1.DailyQuestionStatus.REVEALED, revealedAt: new Date() },
            }),
            this.prisma.answer.updateMany({
                where: { dailyQuestionId },
                data: { isRevealed: true },
            }),
        ]);
        await this.redis.publish(`couple_${couple.id}`, JSON.stringify({
            type: 'ANSWERS_REVEALED',
            questionId: dailyQuestionId,
            timestamp: Date.now(),
        }));
        return {
            answers: dailyQuestion.answers.map((a) => ({
                id: a.id,
                userId: a.userId,
                text: a.text,
                createdAt: a.createdAt,
            })),
        };
    }
    getUtcDateNormalized() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
};
exports.AnswerService = AnswerService;
exports.AnswerService = AnswerService = AnswerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        streak_service_1.StreakService])
], AnswerService);
//# sourceMappingURL=answer.service.js.map