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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        let user = await this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            include: { profile: true, subscription: { include: { plan: true } } },
        });
        if (!user) {
            try {
                const { createClerkClient } = require('@clerk/clerk-sdk-node');
                const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
                const clerkUser = await clerkClient.users.getUser(userId);
                const primaryEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
                    ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
                if (primaryEmail) {
                    user = await this.prisma.user.upsert({
                        where: { id: userId },
                        update: {},
                        create: {
                            id: userId,
                            email: primaryEmail,
                            isOnboarded: false,
                        },
                        include: { profile: true, subscription: { include: { plan: true } } },
                    });
                }
            }
            catch (e) {
                console.error('Failed to lazy sync user from clerk:', e);
            }
        }
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            id: user.id,
            email: user.email,
            isOnboarded: user.isOnboarded,
            lastActiveAt: user.lastActiveAt,
            profile: user.profile,
            subscription: user.subscription
                ? {
                    tier: user.subscription.plan.tier,
                    status: user.subscription.status,
                    expiresAt: user.subscription.currentPeriodEnd,
                }
                : null,
        };
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const profile = await this.prisma.profile.upsert({
            where: { userId },
            update: {
                displayName: dto.displayName,
                avatarUrl: dto.avatarUrl,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                gender: dto.gender,
                bio: dto.bio,
                timezone: dto.timezone,
            },
            create: {
                userId,
                displayName: dto.displayName ?? '',
                avatarUrl: dto.avatarUrl,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                gender: dto.gender,
                bio: dto.bio,
                timezone: dto.timezone ?? 'UTC',
            },
        });
        if (!user.isOnboarded && dto.displayName) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { isOnboarded: true },
            });
        }
        return profile;
    }
    async deactivateAccount(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date() },
        });
        return { deactivated: true };
    }
    async updateLastActive(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: new Date() },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map