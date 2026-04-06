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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  coupleId?: string;
}

interface CoupleEvent {
  type: string;
  questionId?: string;
  userId?: string;
  partnerId?: string;
  bothAnswered?: boolean;
  timestamp?: number;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
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
  private readonly processedMessages = new Map<string, number>();
  private deduplicationCleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async afterInit() {
    await this.redis.subscribe('couple_*', (channel: string, message: string) => {
      this.handleRedisMessage(channel, message);
    });

    this.deduplicationCleanupInterval = setInterval(() => {
      this.cleanupProcessedMessages();
    }, 60_000);

    this.logger.log('WebSocket gateway initialized, Redis subscription active');
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

      const payload = this.verifyToken(token);

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

      await this.redis.setWithExpiry(`online:${payload.sub}`, client.id, 86400);

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
          await this.redis.del(`online:${client.userId}`);
        }
      }
      this.logger.log(`Client disconnected: ${client.userId} (${client.id})`);
    }
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

  private handleRedisMessage(channel: string, message: string) {
    try {
      const event: CoupleEvent = JSON.parse(message);

      const messageKey = `${channel}:${event.type}:${event.timestamp}`;
      if (this.processedMessages.has(messageKey)) {
        return;
      }
      this.processedMessages.set(messageKey, Date.now());

      const roomName = channel;

      switch (event.type) {
        case 'PARTNER_ANSWERED':
          this.server.to(roomName).emit('partner_answered', {
            questionId: event.questionId,
            bothAnswered: event.bothAnswered,
            timestamp: event.timestamp,
          });
          break;

        case 'ANSWERS_REVEALED':
          this.server.to(roomName).emit('answers_revealed', {
            questionId: event.questionId,
            timestamp: event.timestamp,
          });
          break;

        default:
          this.server.to(roomName).emit(event.type.toLowerCase(), event);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to process Redis message on ${channel}`, (error as Error).message);
    }
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

  private verifyToken(token: string): any | null {
    try {
      return this.jwt.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      return null;
    }
  }

  private cleanupProcessedMessages() {
    const cutoff = Date.now() - 60_000;
    for (const [key, timestamp] of this.processedMessages) {
      if (timestamp < cutoff) {
        this.processedMessages.delete(key);
      }
    }
  }

  emitToUser(userId: string, event: string, payload: any) {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        this.server.to(socketId).emit(event, payload);
      }
    }
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
