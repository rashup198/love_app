import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MessageType } from '@prisma/client';
export declare class MessageService {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    sendMessage(senderId: string, coupleId: string, content: string, type?: MessageType): Promise<{
        type: import(".prisma/client").$Enums.MessageType;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        senderId: string;
        coupleId: string;
        content: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    getMessages(coupleId: string, page?: number, limit?: number): Promise<{
        items: ({
            sender: {
                profile: {
                    displayName: string;
                    avatarUrl: string | null;
                } | null;
                id: string;
            };
        } & {
            type: import(".prisma/client").$Enums.MessageType;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            senderId: string;
            coupleId: string;
            content: string;
            isRead: boolean;
            readAt: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    markAsRead(userId: string, coupleId: string): Promise<{
        markedRead: number;
    }>;
    deleteMessage(userId: string, messageId: string): Promise<{
        deleted: boolean;
    }>;
}
