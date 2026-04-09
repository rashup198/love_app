import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationType, NotificationChannel, DeliveryStatus } from '@prisma/client';
export declare class NotificationsService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    create(data: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        channel?: NotificationChannel;
        data?: Record<string, any>;
    }): Promise<{
        type: import(".prisma/client").$Enums.NotificationType;
        id: string;
        createdAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.DeliveryStatus;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        readAt: Date | null;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        title: string;
        body: string;
        sentAt: Date | null;
        failedAt: Date | null;
        failReason: string | null;
    }>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
        items: {
            type: import(".prisma/client").$Enums.NotificationType;
            id: string;
            createdAt: Date;
            userId: string;
            status: import(".prisma/client").$Enums.DeliveryStatus;
            data: import("@prisma/client/runtime/client").JsonValue | null;
            readAt: Date | null;
            channel: import(".prisma/client").$Enums.NotificationChannel;
            title: string;
            body: string;
            sentAt: Date | null;
            failedAt: Date | null;
            failReason: string | null;
        }[];
        unreadCount: number;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    markAsRead(userId: string, notificationId: string): Promise<{
        read: boolean;
    }>;
    markAllAsRead(userId: string): Promise<{
        markedRead: number;
    }>;
    updateDeliveryStatus(notificationId: string, status: DeliveryStatus, failReason?: string): Promise<void>;
}
