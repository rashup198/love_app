import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { DailyQuestionService } from './daily-question.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService, DailyQuestionService],
  exports: [ContentService, DailyQuestionService],
})
export class ContentModule {}
