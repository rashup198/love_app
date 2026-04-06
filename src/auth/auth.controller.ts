import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.email);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub, user.sessionId);
  }

  @Post('invite-code')
  @HttpCode(HttpStatus.CREATED)
  async generateInviteCode(@CurrentUser() user: JwtPayload) {
    const inviteCode = await this.authService.generateInviteCode(user.sub);
    return { inviteCode };
  }
}
