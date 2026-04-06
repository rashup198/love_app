import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { StreakService } from './streak.service';

@Module({
  controllers: [CouplesController],
  providers: [CouplesService, StreakService],
  exports: [CouplesService, StreakService],
})
export class CouplesModule {}
