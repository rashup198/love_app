import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export declare class TokenService {
    private readonly jwt;
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private readonly refreshSecret;
    private readonly refreshExpiry;
    constructor(jwt: JwtService, config: ConfigService, prisma: PrismaService);
    generateTokenPair(userId: string, email: string, sessionId: string): Promise<TokenPair>;
    validateRefreshToken(token: string): Promise<{
        sub: string;
        email: string;
        sessionId: string;
    } | null>;
    rotateRefreshToken(oldToken: string, userId: string, email: string, sessionId: string): Promise<TokenPair>;
    private hashToken;
}
export {};
