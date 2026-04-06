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
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const client_1 = require("@prisma/client");
let MessageService = class MessageService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async sendMessage(senderId, coupleId, content, type = client_1.MessageType.TEXT) {
        const couple = await this.prisma.couple.findUnique({ where: { id: coupleId } });
        if (!couple || couple.deletedAt) {
            throw new common_1.NotFoundException('Couple not found');
        }
        const isPartOfCouple = couple.userAId === senderId || couple.userBId === senderId;
        if (!isPartOfCouple) {
            throw new common_1.BadRequestException('You are not part of this couple');
        }
        const message = await this.prisma.message.create({
            data: { coupleId, senderId, content, type },
        });
        const receiverId = couple.userAId === senderId ? couple.userBId : couple.userAId;
        await this.redis.publishEvent('message:sent', {
            coupleId,
            senderId,
            receiverId,
            messageId: message.id,
            type,
        });
        return message;
    }
    async getMessages(coupleId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { coupleId, deletedAt: null },
                include: {
                    sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.message.count({ where: { coupleId, deletedAt: null } }),
        ]);
        return {
            items: items.reverse(),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async markAsRead(userId, coupleId) {
        const result = await this.prisma.message.updateMany({
            where: {
                coupleId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true, readAt: new Date() },
        });
        return { markedRead: result.count };
    }
    async deleteMessage(userId, messageId) {
        const message = await this.prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== userId) {
            throw new common_1.BadRequestException('Cannot delete this message');
        }
        await this.prisma.message.update({
            where: { id: messageId },
            data: { deletedAt: new Date() },
        });
        return { deleted: true };
    }
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], MessageService);
//# sourceMappingURL=message.service.js.map