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
exports.InviteService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let InviteService = class InviteService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.INVITE_EXPIRY_HOURS = 48;
    }
    async createInvite(senderId) {
        let user = await this.prisma.user.findUnique({ where: { id: senderId } });
        if (!user) {
            try {
                const { createClerkClient } = require('@clerk/clerk-sdk-node');
                const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
                const clerkUser = await clerkClient.users.getUser(senderId);
                const primaryEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
                    ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
                if (primaryEmail) {
                    user = await this.prisma.user.upsert({
                        where: { id: senderId },
                        update: {},
                        create: {
                            id: senderId,
                            email: primaryEmail,
                            isOnboarded: false,
                        },
                    });
                }
            }
            catch (e) {
                console.error('Failed to lazy sync user from clerk in createInvite:', e);
            }
            if (!user) {
                throw new common_1.BadRequestException('User is not fully synced to DB yet. Please try again.');
            }
        }
        const existingCouple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: senderId }, { userBId: senderId }],
                deletedAt: null,
                status: { not: client_1.CoupleStatus.DISSOLVED },
            },
        });
        if (existingCouple) {
            throw new common_1.ConflictException('You are already in a couple');
        }
        const pendingInvite = await this.prisma.coupleInvite.findFirst({
            where: { senderId, status: client_1.InviteStatus.PENDING },
        });
        if (pendingInvite) {
            return { inviteCode: pendingInvite.inviteCode, expiresAt: pendingInvite.expiresAt };
        }
        const inviteCode = (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
        const expiresAt = new Date(Date.now() + this.INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
        const invite = await this.prisma.coupleInvite.create({
            data: {
                senderId,
                inviteCode,
                expiresAt,
            },
        });
        await this.redis.setWithExpiry(`invite:${inviteCode}`, senderId, this.INVITE_EXPIRY_HOURS * 3600);
        return { inviteCode: invite.inviteCode, expiresAt: invite.expiresAt };
    }
    async acceptInvite(receiverId, inviteCode) {
        const invite = await this.prisma.coupleInvite.findUnique({
            where: { inviteCode },
        });
        if (!invite) {
            throw new common_1.NotFoundException('Invite not found');
        }
        if (invite.status !== client_1.InviteStatus.PENDING) {
            throw new common_1.BadRequestException('Invite is no longer active');
        }
        if (invite.expiresAt < new Date()) {
            await this.prisma.coupleInvite.update({
                where: { id: invite.id },
                data: { status: client_1.InviteStatus.EXPIRED },
            });
            throw new common_1.BadRequestException('Invite has expired');
        }
        if (invite.senderId === receiverId) {
            throw new common_1.BadRequestException('Cannot accept your own invite');
        }
        const existingCouple = await this.prisma.couple.findFirst({
            where: {
                OR: [{ userAId: receiverId }, { userBId: receiverId }],
                deletedAt: null,
                status: { not: client_1.CoupleStatus.DISSOLVED },
            },
        });
        if (existingCouple) {
            throw new common_1.ConflictException('You are already in a couple');
        }
        const [couple] = await this.prisma.$transaction([
            this.prisma.couple.create({
                data: {
                    userAId: invite.senderId,
                    userBId: receiverId,
                    status: client_1.CoupleStatus.ACTIVE,
                },
            }),
            this.prisma.coupleInvite.update({
                where: { id: invite.id },
                data: {
                    receiverId,
                    status: client_1.InviteStatus.ACCEPTED,
                    respondedAt: new Date(),
                },
            }),
            this.prisma.coupleInvite.updateMany({
                where: {
                    senderId: invite.senderId,
                    status: client_1.InviteStatus.PENDING,
                    id: { not: invite.id },
                },
                data: { status: client_1.InviteStatus.CANCELLED },
            }),
        ]);
        await this.redis.del(`invite:${inviteCode}`);
        await this.redis.publish(`couple_pairing`, JSON.stringify({
            type: 'COUPLE_PAIRED',
            coupleId: couple.id,
            user1Id: invite.senderId,
            user2Id: receiverId,
            timestamp: Date.now(),
        }));
        return {
            coupleId: couple.id,
            partnerId: invite.senderId,
        };
    }
    async cancelInvite(senderId, inviteCode) {
        const invite = await this.prisma.coupleInvite.findFirst({
            where: { senderId, inviteCode, status: client_1.InviteStatus.PENDING },
        });
        if (!invite) {
            throw new common_1.NotFoundException('Invite not found');
        }
        await this.prisma.coupleInvite.update({
            where: { id: invite.id },
            data: { status: client_1.InviteStatus.CANCELLED },
        });
        await this.redis.del(`invite:${inviteCode}`);
        return { cancelled: true };
    }
};
exports.InviteService = InviteService;
exports.InviteService = InviteService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], InviteService);
//# sourceMappingURL=invite.service.js.map