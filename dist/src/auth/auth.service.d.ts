import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
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
export declare class AuthService {
    private readonly prisma;
    private readonly redis;
    private readonly jwt;
    private readonly config;
    private readonly logger;
    private readonly otpStore;
    private readonly otpRequestCounts;
    private readonly OTP_EXPIRY_MS;
    private readonly OTP_MAX_ATTEMPTS;
    private readonly OTP_RATE_LIMIT;
    private readonly OTP_RATE_WINDOW_MS;
    private readonly INVITE_CODE_LENGTH;
    private readonly INVITE_CODE_MAX_RETRIES;
    private readonly SESSION_EXPIRY_DAYS;
    private readonly REFRESH_TOKEN_EXPIRY_DAYS;
    private readonly jwtSecret;
    private readonly jwtRefreshSecret;
    private readonly accessTokenExpiry;
    private readonly refreshTokenExpiry;
    constructor(prisma: PrismaService, redis: RedisService, jwt: JwtService, config: ConfigService);
    requestOtp(email: string): Promise<{
        sent: boolean;
    }>;
    verifyOtp(email: string, otp: string): Promise<AuthResponse>;
    refreshTokens(refreshToken: string): Promise<TokenPair>;
    logout(userId: string, sessionId: string): Promise<{
        loggedOut: boolean;
    }>;
    generateInviteCode(userId: string): Promise<string>;
    private generateTokens;
    private resolveUserCoupleId;
    private resolveUserInviteCode;
    private enforceOtpRateLimit;
    private generateSecureOtp;
    private generateRandomAlphanumeric;
    private hashToken;
}
