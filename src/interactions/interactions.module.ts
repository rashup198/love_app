import { Module } from '@nestjs/common';
import { InteractionsController } from './interactions.controller';
import { AnswerService } from './answer.service';
import { ReactionService } from './reaction.service';
import { MessageService } from './message.service';
import { CouplesModule } from '../couples/couples.module';

@Module({
  imports: [CouplesModule],
  controllers: [InteractionsController],
  providers: [AnswerService, ReactionService, MessageService],
  exports: [AnswerService],
})
export class InteractionsModule {}
