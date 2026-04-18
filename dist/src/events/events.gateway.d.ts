import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
interface AuthenticatedSocket extends Socket {
    userId?: string;
    coupleId?: string;
}
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly config;
    private readonly prisma;
    server: Server;
    private readonly logger;
    private readonly connectedUsers;
    constructor(config: ConfigService, prisma: PrismaService);
    afterInit(): void;
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): Promise<void>;
    handleJoinUserRoom(client: AuthenticatedSocket, data: {
        userId: string;
    }): Promise<void>;
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
    private extractToken;
    private verifyToken;
    emitToUser(userId: string, event: string, payload: any): void;
    emitToCouple(coupleId: string, event: string, payload: any): void;
    isUserOnline(userId: string): boolean;
    getOnlineCount(): number;
}
export {};
