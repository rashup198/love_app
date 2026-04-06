import { NotificationsService } from './notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(user: JwtPayload, page?: string, limit?: string): Promise<{
        items: {
            type: import(".prisma/client").$Enums.NotificationType;
            id: string;
            createdAt: Date;
            data: import("@prisma/client/runtime/client").JsonValue | null;
            userId: string;
            status: import(".prisma/client").$Enums.DeliveryStatus;
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
    markAsRead(user: JwtPayload, id: string): Promise<{
        read: boolean;
    }>;
    markAllAsRead(user: JwtPayload): Promise<{
        markedRead: number;
    }>;
}
