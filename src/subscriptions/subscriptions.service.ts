import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionStatus,
  SubscriptionTier,
  PaymentPlatform,
} from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceCents: 'asc' },
    });
  }

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      return { tier: SubscriptionTier.FREE, status: null };
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

  async createSubscription(
    userId: string,
    planId: string,
    platform: PaymentPlatform,
    platformSubscriptionId: string,
    receiptData: string,
    transactionId: string,
    amountCents: number,
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Already subscribed');
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
              status: SubscriptionStatus.ACTIVE,
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
              status: SubscriptionStatus.ACTIVE,
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

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('No active subscription');
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return { cancelled: true, activeUntil: subscription.currentPeriodEnd };
  }

  async checkExpiredSubscriptions() {
    const now = new Date();
    const result = await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lt: now },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    this.logger.log(`Expired ${result.count} subscriptions`);
    return { expired: result.count };
  }
}
