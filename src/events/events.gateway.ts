import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  coupleId?: string;
}



@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
  transports: ['websocket'],
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized with Redis Adapter');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connection rejected: no token (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const payload = await this.verifyToken(token);

      if (!payload || !payload.sub) {
        this.logger.warn(`Connection rejected: invalid token (${client.id})`);
        client.emit('error', { message: 'Invalid or expired token' });
        client.disconnect(true);
        return;
      }

      client.userId = payload.sub;
      client.coupleId = payload.coupleId ?? undefined;

      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)!.add(client.id);

      if (payload.coupleId) {
        await client.join(`couple_${payload.coupleId}`);
        client.coupleId = payload.coupleId;
      }

      await client.join(`user_${payload.sub}`);

      client.emit('authenticated', {
        userId: payload.sub,
        coupleId: payload.coupleId ?? null,
      });

      this.logger.log(`Client connected: ${payload.sub} (${client.id})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${(error as Error).message} (${client.id})`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(`Client disconnected: ${client.userId} (${client.id})`);
    }
  }

  @SubscribeMessage('joinUserRoom')
  async handleJoinUserRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    if (!client.userId || client.userId !== data.userId) {
      client.emit('error', { message: 'Not authenticated or invalid userId' });
      return;
    }
    await client.join(`user_${data.userId}`);
    this.logger.log(`${client.userId} joined user room: user_${data.userId}`);
  }

  @SubscribeMessage('joinCoupleRoom')
  async handleJoinCoupleRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { coupleId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!data?.coupleId) {
      client.emit('error', { message: 'coupleId is required' });
      return;
    }

    const couple = await this.prisma.couple.findFirst({
      where: {
        id: data.coupleId,
        OR: [{ userAId: client.userId }, { userBId: client.userId }],
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!couple) {
      client.emit('error', { message: 'You are not part of this couple' });
      return;
    }

    if (client.coupleId && client.coupleId !== data.coupleId) {
      await client.leave(`couple_${client.coupleId}`);
    }

    await client.join(`couple_${data.coupleId}`);
    client.coupleId = data.coupleId;

    client.emit('joinedCoupleRoom', { coupleId: data.coupleId });
    this.logger.log(`${client.userId} joined couple room: ${data.coupleId}`);
  }

  @SubscribeMessage('leaveCoupleRoom')
  async handleLeaveCoupleRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { coupleId: string },
  ) {
    if (data?.coupleId) {
      await client.leave(`couple_${data.coupleId}`);
      if (client.coupleId === data.coupleId) {
        client.coupleId = undefined;
      }
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { coupleId: string },
  ) {
    if (!client.userId || !data?.coupleId) return;

    client.to(`couple_${data.coupleId}`).emit('partner_typing', {
      userId: client.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', { timestamp: Date.now() });
  }



  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (authToken && typeof authToken === 'string') {
      return authToken;
    }

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any | null> {
    try {
      return await verifyToken(token, {
        secretKey: this.config.get<string>('CLERK_SECRET_KEY'),
        issuer: null,
      });
    } catch {
      return null;
    }
  }



  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }

  emitToCouple(coupleId: string, event: string, payload: any) {
    this.server.to(`couple_${coupleId}`).emit(event, payload);
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineCount(): number {
    return this.connectedUsers.size;
  }
}
