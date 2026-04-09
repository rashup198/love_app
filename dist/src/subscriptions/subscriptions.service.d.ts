import { PrismaService } from '../prisma/prisma.service';
import { PaymentPlatform } from '@prisma/client';
export declare class SubscriptionsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getPlans(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tier: import(".prisma/client").$Enums.SubscriptionTier;
        description: string;
        monthlyPriceCents: number;
        yearlyPriceCents: number;
        maxQuestionsPerDay: number;
        hasCustomQuestions: boolean;
        hasMoodInsights: boolean;
        hasAdvancedAnalytics: boolean;
        hasPrioritySupport: boolean;
        isActive: boolean;
    }[]>;
    getUserSubscription(userId: string): Promise<{
        tier: "FREE";
        status: null;
        id?: undefined;
        currentPeriodEnd?: undefined;
        cancelledAt?: undefined;
        entitlements?: undefined;
    } | {
        id: string;
        tier: import(".prisma/client").$Enums.SubscriptionTier;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        currentPeriodEnd: Date;
        cancelledAt: Date | null;
        entitlements: {
            maxQuestionsPerDay: number;
            hasCustomQuestions: boolean;
            hasMoodInsights: boolean;
            hasAdvancedAnalytics: boolean;
            hasPrioritySupport: boolean;
        };
    }>;
    createSubscription(userId: string, planId: string, platform: PaymentPlatform, platformSubscriptionId: string, receiptData: string, transactionId: string, amountCents: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        planId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        platform: import(".prisma/client").$Enums.PaymentPlatform;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelledAt: Date | null;
        trialEndsAt: Date | null;
        platformSubscriptionId: string | null;
        platformCustomerId: string | null;
    }>;
    cancelSubscription(userId: string): Promise<{
        cancelled: boolean;
        activeUntil: Date;
    }>;
    checkExpiredSubscriptions(): Promise<{
        expired: number;
    }>;
}
