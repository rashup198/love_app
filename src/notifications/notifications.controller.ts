import { Controller, Get, Post, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.sub, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }
}
