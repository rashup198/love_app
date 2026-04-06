import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
interface AuthenticatedSocket extends Socket {
    userId?: string;
    coupleId?: string;
}
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly config;
    private readonly prisma;
    private readonly redis;
    server: Server;
    private readonly logger;
    private readonly connectedUsers;
    private readonly processedMessages;
    private deduplicationCleanupInterval;
    constructor(jwt: JwtService, config: ConfigService, prisma: PrismaService, redis: RedisService);
    afterInit(): Promise<void>;
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): Promise<void>;
    handleJoinCoupleRoom(client: AuthenticatedSocket, data: {
        coupleId: string;
    }): Promise<void>;
    handleLeaveCoupleRoom(client: AuthenticatedSocket, data: {
        coupleId: string;
    }): Promise<void>;
    handleTyping(client: AuthenticatedSocket, data: {
        coupleId: string;
    }): void;
    handlePing(client: AuthenticatedSocket): void;
    private handleRedisMessage;
    private extractToken;
    private verifyToken;
    private cleanupProcessedMessages;
    emitToUser(userId: string, event: string, payload: any): void;
    emitToCouple(coupleId: string, event: string, payload: any): void;
    isUserOnline(userId: string): boolean;
    getOnlineCount(): number;
}
export {};
