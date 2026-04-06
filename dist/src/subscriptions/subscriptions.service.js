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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SubscriptionsService_1.name);
    }
    async getPlans() {
        return this.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { monthlyPriceCents: 'asc' },
        });
    }
    async getUserSubscription(userId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { userId },
            include: { plan: true },
        });
        if (!subscription) {
            return { tier: client_1.SubscriptionTier.FREE, status: null };
        }
        return {
            id: subscription.id,
            tier: subscription.plan.tier,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelledAt: subscription.cancelledAt,
            entitlements: {
                maxQuestionsPerDay: subscription.plan.maxQuestionsPerDay,
                hasCustomQuestions: subscription.plan.hasCustomQuestions,
                hasMoodInsights: subscription.plan.hasMoodInsights,
                hasAdvancedAnalytics: subscription.plan.hasAdvancedAnalytics,
                hasPrioritySupport: subscription.plan.hasPrioritySupport,
            },
        };
    }
    async createSubscription(userId, planId, platform, platformSubscriptionId, receiptData, transactionId, amountCents) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });
        if (!plan || !plan.isActive) {
            throw new common_1.NotFoundException('Plan not found');
        }
        const existing = await this.prisma.subscription.findUnique({
            where: { userId },
        });
        if (existing && existing.status === client_1.SubscriptionStatus.ACTIVE) {
            throw new common_1.BadRequestException('Already subscribed');
        }
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);
        const subscription = await this.prisma.$transaction(async (tx) => {
            const sub = existing
                ? await tx.subscription.update({
                    where: { userId },
                    data: {
                        planId,
                        status: client_1.SubscriptionStatus.ACTIVE,
                        platform,
                        platformSubscriptionId,
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                        cancelledAt: null,
                    },
                })
                : await tx.subscription.create({
                    data: {
                        userId,
                        planId,
                        status: client_1.SubscriptionStatus.ACTIVE,
                        platform,
                        platformSubscriptionId,
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                });
            await tx.platformReceipt.create({
                data: {
                    subscriptionId: sub.id,
                    platform,
                    receiptData,
                    transactionId,
                    amountCents,
                },
            });
            return sub;
        });
        return subscription;
    }
    async cancelSubscription(userId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { userId },
        });
        if (!subscription || subscription.status !== client_1.SubscriptionStatus.ACTIVE) {
            throw new common_1.BadRequestException('No active subscription');
        }
        await this.prisma.subscription.update({
            where: { userId },
            data: {
                status: client_1.SubscriptionStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
        return { cancelled: true, activeUntil: subscription.currentPeriodEnd };
    }
    async checkExpiredSubscriptions() {
        const now = new Date();
        const result = await this.prisma.subscription.updateMany({
            where: {
                status: client_1.SubscriptionStatus.ACTIVE,
                currentPeriodEnd: { lt: now },
            },
            data: { status: client_1.SubscriptionStatus.EXPIRED },
        });
        this.logger.log(`Expired ${result.count} subscriptions`);
        return { expired: result.count };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map