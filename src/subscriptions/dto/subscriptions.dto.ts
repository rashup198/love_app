import { IsString, IsNotEmpty, IsEnum, IsInt, Min } from 'class-validator';
import { PaymentPlatform } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(PaymentPlatform)
  platform: PaymentPlatform;

  @IsString()
  @IsNotEmpty()
  platformSubscriptionId: string;

  @IsString()
  @IsNotEmpty()
  receiptData: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsInt()
  @Min(0)
  amountCents: number;
}
