"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, redis, jwt, config) {
        this.prisma = prisma;
        this.redis = redis;
        this.jwt = jwt;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.otpStore = new Map();
        this.otpRequestCounts = new Map();
        this.OTP_EXPIRY_MS = 5 * 60 * 1000;
        this.OTP_MAX_ATTEMPTS = 5;
        this.OTP_RATE_LIMIT = 5;
        this.OTP_RATE_WINDOW_MS = 60 * 60 * 1000;
        this.INVITE_CODE_LENGTH = 8;
        this.INVITE_CODE_MAX_RETRIES = 10;
        this.SESSION_EXPIRY_DAYS = 30;
        this.REFRESH_TOKEN_EXPIRY_DAYS = 30;
        this.jwtSecret = this.config.getOrThrow('JWT_SECRET');
        this.jwtRefreshSecret = this.config.getOrThrow('JWT_REFRESH_SECRET');
        this.accessTokenExpiry = this.config.get('JWT_ACCESS_EXPIRY', '15m');
        this.refreshTokenExpiry = this.config.get('JWT_REFRESH_EXPIRY', '30d');
    }
    async requestOtp(email) {
        const normalizedEmail = email.toLowerCase().trim();
        this.enforceOtpRateLimit(normalizedEmail);
        const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existingUser && existingUser.deletedAt) {
            throw new common_1.ConflictException('Account has been deactivated');
        }
        const code = this.generateSecureOtp();
        this.otpStore.set(normalizedEmail, {
            code,
            expiresAt: Date.now() + this.OTP_EXPIRY_MS,
            attempts: 0,
        });
        if (existingUser) {
            await this.prisma.otp.updateMany({
                where: { userId: existingUser.id, purpose: client_1.OtpPurpose.LOGIN, isUsed: false },
                data: { isUsed: true },
            });
            await this.prisma.otp.create({
                data: {
                    userId: existingUser.id,
                    code,
                    purpose: client_1.OtpPurpose.LOGIN,
                    expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MS),
                    maxAttempts: this.OTP_MAX_ATTEMPTS,
                },
            });
        }
        this.logger.log(`OTP generated for ${normalizedEmail}: ${code}`);
        return { sent: true };
    }
    async verifyOtp(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        const stored = this.otpStore.get(normalizedEmail);
        if (!stored) {
            throw new common_1.UnauthorizedException('No OTP requested for this email');
        }
        if (Date.now() > stored.expiresAt) {
            this.otpStore.delete(normalizedEmail);
            throw new common_1.UnauthorizedException('OTP has expired');
        }
        if (stored.attempts >= this.OTP_MAX_ATTEMPTS) {
            this.otpStore.delete(normalizedEmail);
            throw new common_1.UnauthorizedException('Maximum OTP attempts exceeded');
        }
        if (stored.code !== otp) {
            stored.attempts += 1;
            throw new common_1.UnauthorizedException('Invalid OTP');
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
        }
        else if (!user.isEmailVerified) {
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
    async refreshTokens(refreshToken) {
        let payload;
        try {
            payload = this.jwt.verify(refreshToken, { secret: this.jwtRefreshSecret });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
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
            throw new common_1.UnauthorizedException('Refresh token has been revoked');
        }
        if (storedToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user || user.deletedAt) {
            throw new common_1.UnauthorizedException('User not found or deactivated');
        }
        const session = await this.prisma.session.findFirst({
            where: { id: payload.sessionId, userId: user.id, isActive: true },
        });
        if (!session) {
            throw new common_1.UnauthorizedException('Session has been invalidated');
        }
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true },
        });
        const coupleId = await this.resolveUserCoupleId(user.id);
        const newTokens = await this.generateTokens(user.id, coupleId, session.id, storedToken.familyId);
        return newTokens;
    }
    async logout(userId, sessionId) {
        await this.prisma.session.updateMany({
            where: { id: sessionId, userId },
            data: { isActive: false },
        });
        await this.redis.del(`session:${sessionId}`);
        return { loggedOut: true };
    }
    async generateInviteCode(userId) {
        const existingCouple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: { not: client_1.CoupleStatus.DISSOLVED },
            },
        });
        if (existingCouple) {
            throw new common_1.ConflictException('You are already in a couple');
        }
        const pendingInvite = await this.prisma.coupleInvite.findFirst({
            where: { senderId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
        });
        if (pendingInvite) {
            return pendingInvite.inviteCode;
        }
        let inviteCode;
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
        throw new common_1.ConflictException('Failed to generate unique invite code. Please try again.');
    }
    async generateTokens(userId, coupleId, sessionId, familyId) {
        const tokenPayload = { sub: userId, coupleId, sessionId };
        const accessToken = this.jwt.sign(tokenPayload, {
            secret: this.jwtSecret,
            expiresIn: this.accessTokenExpiry,
        });
        const refreshToken = this.jwt.sign(tokenPayload, {
            secret: this.jwtRefreshSecret,
            expiresIn: this.refreshTokenExpiry,
        });
        const tokenHash = this.hashToken(refreshToken);
        const resolvedFamilyId = familyId ?? (0, crypto_1.randomBytes)(16).toString('hex');
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
    async resolveUserCoupleId(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: client_1.CoupleStatus.ACTIVE,
            },
            select: { id: true },
        });
        return couple?.id ?? null;
    }
    async resolveUserInviteCode(userId) {
        const invite = await this.prisma.coupleInvite.findFirst({
            where: { senderId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
            select: { inviteCode: true },
        });
        return invite?.inviteCode ?? null;
    }
    enforceOtpRateLimit(email) {
        const now = Date.now();
        const entry = this.otpRequestCounts.get(email);
        if (entry && now < entry.resetAt) {
            if (entry.count >= this.OTP_RATE_LIMIT) {
                throw new common_1.BadRequestException('Too many OTP requests. Please try again later.');
            }
            entry.count += 1;
        }
        else {
            this.otpRequestCounts.set(email, {
                count: 1,
                resetAt: now + this.OTP_RATE_WINDOW_MS,
            });
        }
    }
    generateSecureOtp() {
        return String((0, crypto_1.randomInt)(0, 1000000)).padStart(6, '0');
    }
    generateRandomAlphanumeric(length) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt((0, crypto_1.randomInt)(0, chars.length));
        }
        return result;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map