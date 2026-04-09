import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { StreakService } from './streak.service';
import { InviteService } from './invite.service';

@Module({
  controllers: [CouplesController],
  providers: [CouplesService, StreakService, InviteService],
  exports: [CouplesService, StreakService, InviteService],
})
export class CouplesModule {}
