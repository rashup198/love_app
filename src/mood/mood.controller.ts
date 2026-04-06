import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MoodService } from './mood.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { LogMoodDto } from './dto/mood.dto';

@Controller('mood')
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async logMood(@CurrentUser() user: JwtPayload, @Body() dto: LogMoodDto) {
    return this.moodService.logMood(user.sub, dto.mood, dto.note);
  }

  @Get()
  async getTodaysMood(@CurrentUser() user: JwtPayload) {
    return this.moodService.getTodaysMood(user.sub);
  }

  @Get('history')
  async getMoodHistory(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    return this.moodService.getMoodHistory(user.sub, days ? parseInt(days, 10) : 30);
  }

  @Get('partner')
  async getPartnerMood(
    @CurrentUser() user: JwtPayload,
    @Query('partnerId') partnerId: string,
  ) {
    return this.moodService.getPartnerMood(partnerId);
  }
}
