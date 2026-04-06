import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async sendMessage(
    senderId: string,
    coupleId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
  ) {
    const couple = await this.prisma.couple.findUnique({ where: { id: coupleId } });
    if (!couple || couple.deletedAt) {
      throw new NotFoundException('Couple not found');
    }

    const isPartOfCouple = couple.userAId === senderId || couple.userBId === senderId;
    if (!isPartOfCouple) {
      throw new BadRequestException('You are not part of this couple');
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

  async getMessages(coupleId: string, page = 1, limit = 50) {
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

  async markAsRead(userId: string, coupleId: string) {
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

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) {
      throw new BadRequestException('Cannot delete this message');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
