import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly refreshSecret: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '30d');
  }

  async generateTokenPair(userId: string, email: string, sessionId: string): Promise<TokenPair> {
    const payload = { sub: userId, email, sessionId };

    const accessToken = this.jwt.sign(payload);

    const refreshToken = this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiry as any,
    });

    const familyId = randomBytes(16).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(
    token: string,
  ): Promise<{ sub: string; email: string; sessionId: string } | null> {
    try {
      const payload = this.jwt.verify(token, { secret: this.refreshSecret });

      const tokenHash = this.hashToken(token);
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        if (storedToken) {
          await this.prisma.refreshToken.updateMany({
            where: { familyId: storedToken.familyId },
            data: { isRevoked: true },
          });
        }
        return null;
      }

      return { sub: payload.sub, email: payload.email, sessionId: payload.sessionId };
    } catch {
      return null;
    }
  }

  async rotateRefreshToken(
    oldToken: string,
    userId: string,
    email: string,
    sessionId: string,
  ): Promise<TokenPair> {
    const oldHash = this.hashToken(oldToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: oldHash },
    });

    if (!storedToken) {
      throw new Error('Token not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const payload = { sub: userId, email, sessionId };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiry as any,
    });

    const newHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: newHash,
        familyId: storedToken.familyId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
