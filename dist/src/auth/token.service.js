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
var TokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let TokenService = TokenService_1 = class TokenService {
    constructor(jwt, config, prisma) {
        this.jwt = jwt;
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(TokenService_1.name);
        this.refreshSecret = this.config.getOrThrow('JWT_REFRESH_SECRET');
        this.refreshExpiry = this.config.get('JWT_REFRESH_EXPIRY', '30d');
    }
    async generateTokenPair(userId, email, sessionId) {
        const payload = { sub: userId, email, sessionId };
        const accessToken = this.jwt.sign(payload);
        const refreshToken = this.jwt.sign(payload, {
            secret: this.refreshSecret,
            expiresIn: this.refreshExpiry,
        });
        const familyId = (0, crypto_1.randomBytes)(16).toString('hex');
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
    async validateRefreshToken(token) {
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
        }
        catch {
            return null;
        }
    }
    async rotateRefreshToken(oldToken, userId, email, sessionId) {
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
            expiresIn: this.refreshExpiry,
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
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], TokenService);
//# sourceMappingURL=token.service.js.map