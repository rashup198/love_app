import { SubscriptionsService } from './subscriptions.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateSubscriptionDto } from './dto/subscriptions.dto';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getPlans(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        tier: import(".prisma/client").$Enums.SubscriptionTier;
        description: string;
        monthlyPriceCents: number;
        yearlyPriceCents: number;
        maxQuestionsPerDay: number;
        hasCustomQuestions: boolean;
        hasMoodInsights: boolean;
        hasAdvancedAnalytics: boolean;
        hasPrioritySupport: boolean;
    }[]>;
    getSubscription(user: JwtPayload): Promise<{
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
    createSubscription(user: JwtPayload, dto: CreateSubscriptionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planId: string;
        platform: import(".prisma/client").$Enums.PaymentPlatform;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelledAt: Date | null;
        trialEndsAt: Date | null;
        platformSubscriptionId: string | null;
        platformCustomerId: string | null;
    }>;
    cancelSubscription(user: JwtPayload): Promise<{
        cancelled: boolean;
        activeUntil: Date;
    }>;
}
