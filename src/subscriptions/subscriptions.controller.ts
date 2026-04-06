import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateSubscriptionDto } from './dto/subscriptions.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('me')
  async getSubscription(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getUserSubscription(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(
      user.sub,
      dto.planId,
      dto.platform,
      dto.platformSubscriptionId,
      dto.receiptData,
      dto.transactionId,
      dto.amountCents,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.cancelSubscription(user.sub);
  }
}
