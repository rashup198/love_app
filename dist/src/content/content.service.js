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
var ContentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ContentService = ContentService_1 = class ContentService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ContentService_1.name);
    }
    async getQuestions(filters) {
        const page = filters.page ?? 1;
        const limit = Math.min(filters.limit ?? 20, 100);
        const skip = (page - 1) * limit;
        const where = { isActive: true, deletedAt: null };
        if (filters.category)
            where.category = filters.category;
        if (filters.tier)
            where.tier = filters.tier;
        const [questions, total] = await Promise.all([
            this.prisma.question.findMany({
                where,
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.question.count({ where }),
        ]);
        return {
            items: questions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createQuestion(data) {
        return this.prisma.question.create({
            data: {
                text: data.text,
                category: data.category,
                tier: data.tier ?? client_1.ContentTier.FREE,
                sortOrder: data.sortOrder ?? 0,
            },
        });
    }
    async bulkCreateQuestions(questions) {
        const result = await this.prisma.question.createMany({
            data: questions.map((q) => ({
                text: q.text,
                category: q.category,
                tier: q.tier ?? client_1.ContentTier.FREE,
            })),
            skipDuplicates: true,
        });
        this.logger.log(`Bulk created ${result.count} questions`);
        return { created: result.count };
    }
    async selectQuestionForCouple(coupleId, tier = client_1.ContentTier.FREE) {
        const usedQuestionIds = await this.prisma.dailyQuestion.findMany({
            where: { coupleId },
            select: { questionId: true },
            orderBy: { assignedDate: 'desc' },
            take: 60,
        });
        const excludeIds = usedQuestionIds.map((dq) => dq.questionId);
        const tierFilter = tier === client_1.ContentTier.PREMIUM
            ? [client_1.ContentTier.FREE, client_1.ContentTier.PREMIUM]
            : [client_1.ContentTier.FREE];
        const question = await this.prisma.question.findFirst({
            where: {
                isActive: true,
                deletedAt: null,
                tier: { in: tierFilter },
                ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
            },
            orderBy: { usageCount: 'asc' },
        });
        if (!question && excludeIds.length > 0) {
            return this.prisma.question.findFirst({
                where: {
                    isActive: true,
                    deletedAt: null,
                    tier: { in: tierFilter },
                },
                orderBy: { usageCount: 'asc' },
            });
        }
        return question;
    }
    async getDailyQuestion(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                userAId: true,
                userBId: true,
                userA: { select: { subscription: { select: { plan: { select: { tier: true } } } } } },
                userB: { select: { subscription: { select: { plan: { select: { tier: true } } } } } },
            },
        });
        if (!couple) {
            return {
                status: 'NO_COUPLE',
                message: 'You must be in a couple to receive daily questions',
                question: null,
            };
        }
        const today = this.getUtcDateNormalized();
        const coupleId = couple.id;
        let dailyQuestion = await this.prisma.dailyQuestion.findUnique({
            where: { coupleId_assignedDate: { coupleId, assignedDate: today } },
            include: {
                question: true,
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
            dailyQuestion = await this.assignDailyQuestion(couple, today);
        }
        const userAnswer = dailyQuestion.answers.find((a) => a.userId === userId);
        const partnerId = couple.userAId === userId ? couple.userBId : couple.userAId;
        const partnerAnswer = dailyQuestion.answers.find((a) => a.userId === partnerId);
        const bothAnswered = !!userAnswer && !!partnerAnswer;
        return {
            status: 'OK',
            dailyQuestionId: dailyQuestion.id,
            assignedDate: dailyQuestion.assignedDate,
            questionStatus: dailyQuestion.status,
            question: {
                id: dailyQuestion.question.id,
                text: dailyQuestion.question.text,
                category: dailyQuestion.question.category,
            },
            currentUser: {
                hasAnswered: !!userAnswer,
                answerId: userAnswer?.id ?? null,
            },
            partner: {
                hasAnswered: !!partnerAnswer,
            },
            isRevealed: bothAnswered && (dailyQuestion.status === 'REVEALED' || dailyQuestion.status === 'COMPLETED'),
            answers: bothAnswered
                ? dailyQuestion.answers.map((a) => ({
                    id: a.id,
                    userId: a.userId,
                    text: a.text,
                    createdAt: a.createdAt,
                }))
                : [],
        };
    }
    async assignDailyQuestion(couple, date) {
        const hasPremium = couple.userA.subscription?.plan.tier === 'PREMIUM' ||
            couple.userB.subscription?.plan.tier === 'PREMIUM';
        const tier = hasPremium ? client_1.ContentTier.PREMIUM : client_1.ContentTier.FREE;
        const question = await this.selectQuestionForCouple(couple.id, tier);
        if (!question) {
            throw new Error('No questions available in the content pool');
        }
        try {
            const dailyQuestion = await this.prisma.dailyQuestion.create({
                data: {
                    coupleId: couple.id,
                    questionId: question.id,
                    assignedDate: date,
                    status: 'PENDING',
                },
                include: {
                    question: true,
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
            await this.prisma.question.update({
                where: { id: question.id },
                data: { usageCount: { increment: 1 } },
            });
            this.logger.log(`Assigned question ${question.id} to couple ${couple.id}`);
            return dailyQuestion;
        }
        catch (error) {
            if (error.code === 'P2002') {
                const existing = await this.prisma.dailyQuestion.findUnique({
                    where: { coupleId_assignedDate: { coupleId: couple.id, assignedDate: date } },
                    include: {
                        question: true,
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
                if (existing)
                    return existing;
            }
            throw error;
        }
    }
    getUtcDateNormalized() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = ContentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContentService);
//# sourceMappingURL=content.service.js.map