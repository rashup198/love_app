import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  NotificationType,
  NotificationChannel,
  DeliveryStatus,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    channel?: NotificationChannel;
    data?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        channel: data.channel ?? NotificationChannel.PUSH,
        data: data.data ?? undefined,
        status: DeliveryStatus.QUEUED,
      },
    });

    await this.redis.publishEvent('notification:created', {
      notificationId: notification.id,
      userId: data.userId,
      type: data.type,
    });

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
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

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date(), status: DeliveryStatus.READ },
    });

    return { read: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: DeliveryStatus.READ },
    });

    return { markedRead: result.count };
  }

  async updateDeliveryStatus(notificationId: string, status: DeliveryStatus, failReason?: string) {
    const updateData: any = { status };

    if (status === DeliveryStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === DeliveryStatus.FAILED) {
      updateData.failedAt = new Date();
      updateData.failReason = failReason;
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: updateData,
    });
  }
}
