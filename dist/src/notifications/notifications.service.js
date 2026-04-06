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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const client_1 = require("@prisma/client");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async create(data) {
        const notification = await this.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                body: data.body,
                channel: data.channel ?? client_1.NotificationChannel.PUSH,
                data: data.data ?? undefined,
                status: client_1.DeliveryStatus.QUEUED,
            },
        });
        await this.redis.publishEvent('notification:created', {
            notificationId: notification.id,
            userId: data.userId,
            type: data.type,
        });
        return notification;
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where: { userId } }),
            this.prisma.notification.count({
                where: { userId, readAt: null },
            }),
        ]);
        return {
            items,
            unreadCount,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async markAsRead(userId, notificationId) {
        await this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { readAt: new Date(), status: client_1.DeliveryStatus.READ },
        });
        return { read: true };
    }
    async markAllAsRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date(), status: client_1.DeliveryStatus.READ },
        });
        return { markedRead: result.count };
    }
    async updateDeliveryStatus(notificationId, status, failReason) {
        const updateData = { status };
        if (status === client_1.DeliveryStatus.SENT) {
            updateData.sentAt = new Date();
        }
        else if (status === client_1.DeliveryStatus.FAILED) {
            updateData.failedAt = new Date();
            updateData.failReason = failReason;
        }
        await this.prisma.notification.update({
            where: { id: notificationId },
            data: updateData,
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map