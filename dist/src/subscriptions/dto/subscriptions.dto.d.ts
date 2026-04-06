import { PaymentPlatform } from '@prisma/client';
export declare class CreateSubscriptionDto {
    planId: string;
    platform: PaymentPlatform;
    platformSubscriptionId: string;
    receiptData: string;
    transactionId: string;
    amountCents: number;
}
