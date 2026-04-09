import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CouplesService } from './couples.service';
import { InviteService } from './invite.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { JoinCoupleDto, UpdateRelationshipDto } from './dto/couples.dto';

@Controller('couples')
export class CouplesController {
  constructor(
    private readonly couplesService: CouplesService,
    private readonly inviteService: InviteService,
  ) {}

  @Get()
  async getCouple(@CurrentUser() user: JwtPayload) {
    return this.couplesService.getCouple(user.sub);
  }

  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  async joinCouple(@CurrentUser() user: JwtPayload, @Body() dto: JoinCoupleDto) {
    return this.couplesService.joinCouple(dto.inviteCode, user.sub);
  }

  @Post('invite-code')
  @HttpCode(HttpStatus.CREATED)
  async createInvite(@CurrentUser() user: JwtPayload) {
    return this.inviteService.createInvite(user.sub);
  }

  @Post('relationship-date')
  @HttpCode(HttpStatus.OK)
  async updateRelationshipDate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRelationshipDto,
  ) {
    return this.couplesService.updateRelationshipDate(user.sub, dto.startDate);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async dissolveCouple(@CurrentUser() user: JwtPayload) {
    return this.couplesService.dissolveCouple(user.sub);
  }
}
