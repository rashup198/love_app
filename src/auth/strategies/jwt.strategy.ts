import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  coupleId: string | null;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: user.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session expired or invalidated');
    }

    return {
      sub: payload.sub,
      coupleId: payload.coupleId,
      sessionId: payload.sessionId,
    };
  }
}
