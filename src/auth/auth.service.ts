import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OtpPurpose, CoupleStatus } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'crypto';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    isOnboarded: boolean;
    coupleId: string | null;
    inviteCode: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, OtpRecord>();
  private readonly otpRequestCounts = new Map<string, { count: number; resetAt: number }>();

  private readonly OTP_EXPIRY_MS = 5 * 60 * 1000;
  private readonly OTP_MAX_ATTEMPTS = 5;
  private readonly OTP_RATE_LIMIT = 5;
  private readonly OTP_RATE_WINDOW_MS = 60 * 60 * 1000;
  private readonly INVITE_CODE_LENGTH = 8;
  private readonly INVITE_CODE_MAX_RETRIES = 10;
  private readonly SESSION_EXPIRY_DAYS = 30;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');
    this.jwtRefreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTokenExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY', '15m');
    this.refreshTokenExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '30d');
  }

  async requestOtp(email: string): Promise<{ sent: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();

    this.enforceOtpRateLimit(normalizedEmail);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.deletedAt) {
      throw new ConflictException('Account has been deactivated');
    }

    const code = this.generateSecureOtp();

    this.otpStore.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + this.OTP_EXPIRY_MS,
      attempts: 0,
    });

    if (existingUser) {
      await this.prisma.otp.updateMany({
        where: { userId: existingUser.id, purpose: OtpPurpose.LOGIN, isUsed: false },
        data: { isUsed: true },
      });

      await this.prisma.otp.create({
        data: {
          userId: existingUser.id,
          code,
          purpose: OtpPurpose.LOGIN,
          expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MS),
          maxAttempts: this.OTP_MAX_ATTEMPTS,
        },
      });
    }

    this.logger.log(`OTP generated for ${normalizedEmail}: ${code}`);

    return { sent: true };
  }

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    const stored = this.otpStore.get(normalizedEmail);
    if (!stored) {
      throw new UnauthorizedException('No OTP requested for this email');
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new UnauthorizedException('OTP has expired');
    }

    if (stored.attempts >= this.OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(normalizedEmail);
      throw new UnauthorizedException('Maximum OTP attempts exceeded');
    }

    if (stored.code !== otp) {
      stored.attempts += 1;
      throw new UnauthorizedException('Invalid OTP');
    }

    this.otpStore.delete(normalizedEmail);

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          isEmailVerified: true,
        },
      });
      this.logger.log(`New user created: ${user.id}`);
    } else if (!user.isEmailVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });
    }

    const coupleId = await this.resolveUserCoupleId(user.id);
    const inviteCode = await this.resolveUserInviteCode(user.id);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const tokens = await this.generateTokens(user.id, coupleId, session.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
        coupleId,
        inviteCode,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.jwtRefreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.isRevoked) {
      if (storedToken) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { isRevoked: true },
        });
        this.logger.warn(`Refresh token reuse detected for family ${storedToken.familyId}`);
      }
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    const session = await this.prisma.session.findFirst({
      where: { id: payload.sessionId, userId: user.id, isActive: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session has been invalidated');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const coupleId = await this.resolveUserCoupleId(user.id);
    const newTokens = await this.generateTokens(user.id, coupleId, session.id, storedToken.familyId);

    return newTokens;
  }

  async logout(userId: string, sessionId: string): Promise<{ loggedOut: boolean }> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });

    await this.redis.del(`session:${sessionId}`);

    return { loggedOut: true };
  }

  async generateInviteCode(userId: string): Promise<string> {
    const existingCouple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: { not: CoupleStatus.DISSOLVED },
      },
    });

    if (existingCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const pendingInvite = await this.prisma.coupleInvite.findFirst({
      where: { senderId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
    });

    if (pendingInvite) {
      return pendingInvite.inviteCode;
    }

    let inviteCode: string;
    let retries = 0;

    while (retries < this.INVITE_CODE_MAX_RETRIES) {
      inviteCode = this.generateRandomAlphanumeric(this.INVITE_CODE_LENGTH);

      const collision = await this.prisma.coupleInvite.findUnique({
        where: { inviteCode },
        select: { id: true },
      });

      if (!collision) {
        await this.prisma.coupleInvite.create({
          data: {
            senderId: userId,
            inviteCode,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });

        return inviteCode;
      }

      retries++;
      this.logger.warn(`Invite code collision on attempt ${retries}: ${inviteCode}`);
    }

    throw new ConflictException('Failed to generate unique invite code. Please try again.');
  }

  private async generateTokens(
    userId: string,
    coupleId: string | null,
    sessionId: string,
    familyId?: string,
  ): Promise<TokenPair> {
    const tokenPayload = { sub: userId, coupleId, sessionId };

    const accessToken = this.jwt.sign(tokenPayload, {
      secret: this.jwtSecret,
      expiresIn: this.accessTokenExpiry as any,
    });

    const refreshToken = this.jwt.sign(tokenPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.refreshTokenExpiry as any,
    });

    const tokenHash = this.hashToken(refreshToken);
    const resolvedFamilyId = familyId ?? randomBytes(16).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: resolvedFamilyId,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async resolveUserCoupleId(userId: string): Promise<string | null> {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: CoupleStatus.ACTIVE,
      },
      select: { id: true },
    });

    return couple?.id ?? null;
  }

  private async resolveUserInviteCode(userId: string): Promise<string | null> {
    const invite = await this.prisma.coupleInvite.findFirst({
      where: { senderId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { inviteCode: true },
    });

    return invite?.inviteCode ?? null;
  }

  private enforceOtpRateLimit(email: string): void {
    const now = Date.now();
    const entry = this.otpRequestCounts.get(email);

    if (entry && now < entry.resetAt) {
      if (entry.count >= this.OTP_RATE_LIMIT) {
        throw new BadRequestException('Too many OTP requests. Please try again later.');
      }
      entry.count += 1;
    } else {
      this.otpRequestCounts.set(email, {
        count: 1,
        resetAt: now + this.OTP_RATE_WINDOW_MS,
      });
    }
  }

  private generateSecureOtp(): string {
    return String(randomInt(0, 1000000)).padStart(6, '0');
  }

  private generateRandomAlphanumeric(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomInt(0, chars.length));
    }
    return result;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
