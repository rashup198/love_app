import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { StreakService } from './streak.service';
import { InviteService } from './invite.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [CouplesController],
  providers: [CouplesService, StreakService, InviteService],
  exports: [CouplesService, StreakService, InviteService],
})
export class CouplesModule {}
