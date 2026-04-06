import { Controller, Get, Patch, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(@CurrentUser() user: JwtPayload) {
    return this.usersService.deactivateAccount(user.sub);
  }
}
