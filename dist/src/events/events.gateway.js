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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    constructor(config, prisma, redis) {
        this.config = config;
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(EventsGateway_1.name);
        this.connectedUsers = new Map();
        this.processedMessages = new Map();
    }
    async afterInit() {
        await this.redis.subscribe('couple_*', (channel, message) => {
            this.handleRedisMessage(channel, message);
        });
        this.deduplicationCleanupInterval = setInterval(() => {
            this.cleanupProcessedMessages();
        }, 60_000);
        this.logger.log('WebSocket gateway initialized, Redis subscription active');
    }
    async handleConnection(client) {
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
            this.connectedUsers.get(payload.sub).add(client.id);
            if (payload.coupleId) {
                await client.join(`couple_${payload.coupleId}`);
                client.coupleId = payload.coupleId;
            }
            await client.join(`user_${payload.sub}`);
            await this.redis.setWithExpiry(`online:${payload.sub}`, client.id, 86400);
            client.emit('authenticated', {
                userId: payload.sub,
                coupleId: payload.coupleId ?? null,
            });
            this.logger.log(`Client connected: ${payload.sub} (${client.id})`);
        }
        catch (error) {
            this.logger.warn(`Connection rejected: ${error.message} (${client.id})`);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect(true);
        }
    }
    async handleDisconnect(client) {
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
    async handleJoinUserRoom(client, data) {
        if (!client.userId || client.userId !== data.userId) {
            client.emit('error', { message: 'Not authenticated or invalid userId' });
            return;
        }
        await client.join(`user_${data.userId}`);
        this.logger.log(`${client.userId} joined user room: user_${data.userId}`);
    }
    async handleJoinCoupleRoom(client, data) {
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
    async handleLeaveCoupleRoom(client, data) {
        if (data?.coupleId) {
            await client.leave(`couple_${data.coupleId}`);
            if (client.coupleId === data.coupleId) {
                client.coupleId = undefined;
            }
        }
    }
    handleTyping(client, data) {
        if (!client.userId || !data?.coupleId)
            return;
        client.to(`couple_${data.coupleId}`).emit('partner_typing', {
            userId: client.userId,
            timestamp: Date.now(),
        });
    }
    handlePing(client) {
        client.emit('pong', { timestamp: Date.now() });
    }
    handleRedisMessage(channel, message) {
        try {
            const event = JSON.parse(message);
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
                        answers: event.answers,
                        timestamp: event.timestamp,
                    });
                    break;
                case 'ANSWERS_REVEALED':
                    this.server.to(roomName).emit('answers_revealed', {
                        questionId: event.questionId,
                        timestamp: event.timestamp,
                    });
                    break;
                case 'COUPLE_PAIRED':
                    this.server.to(`user_${event.user1Id}`).emit('couple_paired', {
                        coupleId: event.coupleId,
                    });
                    this.server.to(`user_${event.user2Id}`).emit('couple_paired', {
                        coupleId: event.coupleId,
                    });
                    break;
                default:
                    this.server.to(roomName).emit(event.type.toLowerCase(), event);
                    break;
            }
        }
        catch (error) {
            this.logger.error(`Failed to process Redis message on ${channel}`, error.message);
        }
    }
    extractToken(client) {
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
    async verifyToken(token) {
        try {
            return await (0, clerk_sdk_node_1.verifyToken)(token, {
                secretKey: this.config.get('CLERK_SECRET_KEY'),
                issuer: null,
            });
        }
        catch {
            return null;
        }
    }
    cleanupProcessedMessages() {
        const cutoff = Date.now() - 60_000;
        for (const [key, timestamp] of this.processedMessages) {
            if (timestamp < cutoff) {
                this.processedMessages.delete(key);
            }
        }
    }
    emitToUser(userId, event, payload) {
        const socketIds = this.connectedUsers.get(userId);
        if (socketIds) {
            for (const socketId of socketIds) {
                this.server.to(socketId).emit(event, payload);
            }
        }
    }
    emitToCouple(coupleId, event, payload) {
        this.server.to(`couple_${coupleId}`).emit(event, payload);
    }
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    getOnlineCount() {
        return this.connectedUsers.size;
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinUserRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleJoinUserRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinCoupleRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleJoinCoupleRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveCoupleRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleLeaveCoupleRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePing", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*', credentials: true },
        namespace: '/ws',
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 10000,
    }),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map