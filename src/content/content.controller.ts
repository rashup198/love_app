import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ContentService } from './content.service';
import { DailyQuestionService } from './daily-question.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateQuestionDto, GetQuestionsDto, BulkCreateQuestionsDto } from './dto/content.dto';

@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly dailyQuestionService: DailyQuestionService,
  ) {}

  @Get('questions')
  async getQuestions(@Query() query: GetQuestionsDto) {
    return this.contentService.getQuestions(query);
  }

  @Post('questions')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.contentService.createQuestion(dto);
  }

  @Post('questions/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateQuestions(@Body() dto: BulkCreateQuestionsDto) {
    return this.contentService.bulkCreateQuestions(dto.questions);
  }

  @Get('daily')
  async getTodaysQuestion(@CurrentUser() user: JwtPayload) {
    return this.contentService.getDailyQuestion(user.sub);
  }

  @Get('daily/history')
  async getQuestionHistory(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const coupleId = user.coupleId;
    if (!coupleId) {
      return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    return this.dailyQuestionService.getQuestionHistory(
      coupleId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
