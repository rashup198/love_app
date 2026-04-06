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
var DailyQuestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyQuestionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const content_service_1 = require("./content.service");
const client_1 = require("@prisma/client");
let DailyQuestionService = DailyQuestionService_1 = class DailyQuestionService {
    constructor(prisma, contentService) {
        this.prisma = prisma;
        this.contentService = contentService;
        this.logger = new common_1.Logger(DailyQuestionService_1.name);
    }
    async getTodaysQuestion(coupleId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let dailyQuestion = await this.prisma.dailyQuestion.findUnique({
            where: { coupleId_assignedDate: { coupleId, assignedDate: today } },
            include: { question: true },
        });
        if (!dailyQuestion) {
            dailyQuestion = await this.assignDailyQuestion(coupleId, today);
        }
        return dailyQuestion;
    }
    async assignDailyQuestion(coupleId, date) {
        const couple = await this.prisma.couple.findUnique({
            where: { id: coupleId },
            include: {
                userA: { include: { subscription: { include: { plan: true } } } },
                userB: { include: { subscription: { include: { plan: true } } } },
            },
        });
        if (!couple) {
            throw new common_1.NotFoundException('Couple not found');
        }
        const hasPremium = couple.userA.subscription?.plan.tier === 'PREMIUM' ||
            couple.userB.subscription?.plan.tier === 'PREMIUM';
        const tier = hasPremium ? client_1.ContentTier.PREMIUM : client_1.ContentTier.FREE;
        const question = await this.contentService.selectQuestionForCouple(coupleId, tier);
        if (!question) {
            throw new common_1.NotFoundException('No available questions');
        }
        const dailyQuestion = await this.prisma.dailyQuestion.create({
            data: {
                coupleId,
                questionId: question.id,
                assignedDate: date,
                status: client_1.DailyQuestionStatus.PENDING,
            },
            include: { question: true },
        });
        await this.prisma.question.update({
            where: { id: question.id },
            data: { usageCount: { increment: 1 } },
        });
        return dailyQuestion;
    }
    async assignDailyQuestionsForAllCouples() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeCouples = await this.prisma.couple.findMany({
            where: { status: 'ACTIVE', deletedAt: null },
            select: { id: true },
        });
        let assigned = 0;
        for (const couple of activeCouples) {
            try {
                const existing = await this.prisma.dailyQuestion.findUnique({
                    where: { coupleId_assignedDate: { coupleId: couple.id, assignedDate: today } },
                });
                if (!existing) {
                    await this.assignDailyQuestion(couple.id, today);
                    assigned++;
                }
            }
            catch (error) {
                this.logger.error(`Failed to assign question for couple ${couple.id}`, error);
            }
        }
        this.logger.log(`Assigned daily questions to ${assigned} couples`);
        return { assigned };
    }
    async getQuestionHistory(coupleId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.prisma.dailyQuestion.findMany({
                where: { coupleId },
                include: {
                    question: true,
                    answers: {
                        include: {
                            user: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
                            reactions: true,
                        },
                    },
                },
                orderBy: { assignedDate: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.dailyQuestion.count({ where: { coupleId } }),
        ]);
        return {
            items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
};
exports.DailyQuestionService = DailyQuestionService;
exports.DailyQuestionService = DailyQuestionService = DailyQuestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        content_service_1.ContentService])
], DailyQuestionService);
//# sourceMappingURL=daily-question.service.js.map