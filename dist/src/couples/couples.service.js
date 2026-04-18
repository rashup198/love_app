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
var CouplesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouplesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const redis_service_1 = require("../redis/redis.service");
let CouplesService = CouplesService_1 = class CouplesService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(CouplesService_1.name);
    }
    async joinCouple(inviteCode, userId) {
        const invite = await this.prisma.coupleInvite.findUnique({
            where: { inviteCode },
        });
        if (!invite) {
            throw new common_1.NotFoundException('Invite code not found');
        }
        if (invite.status !== client_1.InviteStatus.PENDING) {
            throw new common_1.BadRequestException('This invite code is no longer active');
        }
        if (invite.expiresAt < new Date()) {
            await this.prisma.coupleInvite.update({
                where: { id: invite.id },
                data: { status: client_1.InviteStatus.EXPIRED },
            });
            throw new common_1.BadRequestException('This invite code has expired');
        }
        if (invite.senderId === userId) {
            throw new common_1.BadRequestException('You cannot join your own invite code');
        }
        const couple = await this.prisma.$transaction(async (tx) => {
            const senderCouple = await tx.couple.findFirst({
                where: {
                    OR: [{ userAId: invite.senderId }, { userBId: invite.senderId }],
                    deletedAt: null,
                    status: { not: client_1.CoupleStatus.DISSOLVED },
                },
                select: { id: true },
            });
            if (senderCouple) {
                throw new common_1.ConflictException('The invite sender is already in a couple');
            }
            const receiverCouple = await tx.couple.findFirst({
                where: {
                    OR: [{ userAId: userId }, { userBId: userId }],
                    deletedAt: null,
                    status: { not: client_1.CoupleStatus.DISSOLVED },
                },
                select: { id: true },
            });
            if (receiverCouple) {
                throw new common_1.ConflictException('You are already in a couple');
            }
            const senderUser = await tx.user.findUnique({
                where: { id: invite.senderId },
                select: { id: true, deletedAt: true },
            });
            if (!senderUser || senderUser.deletedAt) {
                throw new common_1.BadRequestException('The invite sender account is no longer available');
            }
            const newCouple = await tx.couple.create({
                data: {
                    userAId: invite.senderId,
                    userBId: userId,
                    status: client_1.CoupleStatus.ACTIVE,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalInteractions: 0,
                },
            });
            await tx.coupleInvite.update({
                where: { id: invite.id },
                data: {
                    receiverId: userId,
                    status: client_1.InviteStatus.ACCEPTED,
                    respondedAt: new Date(),
                },
            });
            await tx.coupleInvite.updateMany({
                where: {
                    senderId: invite.senderId,
                    status: client_1.InviteStatus.PENDING,
                    id: { not: invite.id },
                },
                data: { status: client_1.InviteStatus.CANCELLED },
            });
            await tx.coupleInvite.updateMany({
                where: {
                    senderId: userId,
                    status: client_1.InviteStatus.PENDING,
                },
                data: { status: client_1.InviteStatus.CANCELLED },
            });
            return newCouple;
        });
        this.logger.log(`Couple created: ${couple.id} (${invite.senderId} + ${userId})`);
        await this.redis.publish(`couple_pairing`, JSON.stringify({
            type: 'COUPLE_PAIRED',
            coupleId: couple.id,
            user1Id: invite.senderId,
            user2Id: userId,
            timestamp: Date.now(),
        }));
        return {
            coupleId: couple.id,
            partnerId: invite.senderId,
            status: couple.status,
            currentStreak: couple.currentStreak,
            createdAt: couple.createdAt,
        };
    }
    async getCouple(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: { not: client_1.CoupleStatus.DISSOLVED },
            },
            include: {
                userA: { include: { profile: true } },
                userB: { include: { profile: true } },
            },
        });
        if (!couple) {
            throw new common_1.NotFoundException('No active couple found');
        }
        const partner = couple.userAId === userId ? couple.userB : couple.userA;
        return {
            id: couple.id,
            status: couple.status,
            partner: {
                id: partner.id,
                displayName: partner.profile?.displayName ?? null,
                avatarUrl: partner.profile?.avatarUrl ?? null,
            },
            relationshipStartDate: couple.relationshipStartDate,
            currentStreak: couple.currentStreak,
            longestStreak: couple.longestStreak,
            totalInteractions: couple.totalInteractions,
            createdAt: couple.createdAt,
        };
    }
    async getCoupleId(userId) {
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
    async getPartnerId(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: client_1.CoupleStatus.ACTIVE,
            },
            select: { userAId: true, userBId: true },
        });
        if (!couple)
            return null;
        return couple.userAId === userId ? couple.userBId : couple.userAId;
    }
    async updateRelationshipDate(userId, startDate) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: client_1.CoupleStatus.ACTIVE,
            },
        });
        if (!couple) {
            throw new common_1.NotFoundException('No active couple found');
        }
        return this.prisma.couple.update({
            where: { id: couple.id },
            data: { relationshipStartDate: new Date(startDate) },
        });
    }
    async dissolveCouple(userId) {
        const couple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                deletedAt: null,
                status: client_1.CoupleStatus.ACTIVE,
            },
        });
        if (!couple) {
            throw new common_1.BadRequestException('No active couple to dissolve');
        }
        await this.prisma.couple.update({
            where: { id: couple.id },
            data: { status: client_1.CoupleStatus.DISSOLVED, deletedAt: new Date() },
        });
        return { dissolved: true };
    }
};
exports.CouplesService = CouplesService;
exports.CouplesService = CouplesService = CouplesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], CouplesService);
//# sourceMappingURL=couples.service.js.map