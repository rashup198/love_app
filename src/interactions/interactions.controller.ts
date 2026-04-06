import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnswerService } from './answer.service';
import { ReactionService } from './reaction.service';
import { MessageService } from './message.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import {
  SubmitAnswerDto,
  AddReactionDto,
  SendMessageDto,
} from './dto/interactions.dto';

@Controller('interactions')
export class InteractionsController {
  constructor(
    private readonly answerService: AnswerService,
    private readonly reactionService: ReactionService,
    private readonly messageService: MessageService,
  ) {}

  @Post('answers')
  @HttpCode(HttpStatus.CREATED)
  async submitAnswer(@CurrentUser() user: JwtPayload, @Body() dto: SubmitAnswerDto) {
    return this.answerService.submitAnswer(user.sub, dto.dailyQuestionId, dto.text);
  }

  @Post('answers/:dailyQuestionId/reveal')
  @HttpCode(HttpStatus.OK)
  async revealAnswers(
    @CurrentUser() user: JwtPayload,
    @Param('dailyQuestionId') dailyQuestionId: string,
  ) {
    return this.answerService.revealAnswers(user.sub, dailyQuestionId);
  }

  @Post('reactions')
  @HttpCode(HttpStatus.CREATED)
  async addReaction(@CurrentUser() user: JwtPayload, @Body() dto: AddReactionDto) {
    return this.reactionService.addReaction(user.sub, dto.answerId, dto.type);
  }

  @Delete('reactions/:answerId')
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @CurrentUser() user: JwtPayload,
    @Param('answerId') answerId: string,
  ) {
    return this.reactionService.removeReaction(user.sub, answerId);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@CurrentUser() user: JwtPayload, @Body() dto: SendMessageDto) {
    return this.messageService.sendMessage(user.sub, dto.coupleId, dto.content, dto.type);
  }

  @Get('messages')
  async getMessages(
    @Query('coupleId') coupleId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messageService.getMessages(
      coupleId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('messages/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() user: JwtPayload, @Body('coupleId') coupleId: string) {
    return this.messageService.markAsRead(user.sub, coupleId);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messageService.deleteMessage(user.sub, id);
  }
}
