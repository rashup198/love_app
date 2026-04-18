import { Module } from '@nestjs/common';
import { InteractionsController } from './interactions.controller';
import { AnswerService } from './answer.service';
import { ReactionService } from './reaction.service';
import { MessageService } from './message.service';
import { CouplesModule } from '../couples/couples.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [CouplesModule, EventsModule],
  controllers: [InteractionsController],
  providers: [AnswerService, ReactionService, MessageService],
  exports: [AnswerService],
})
export class InteractionsModule {}
