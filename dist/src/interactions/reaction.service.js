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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let ReactionService = class ReactionService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async addReaction(userId, answerId, type) {
        const answer = await this.prisma.answer.findUnique({
            where: { id: answerId },
            include: { couple: true },
        });
        if (!answer) {
            throw new common_1.NotFoundException('Answer not found');
        }
        if (!answer.isRevealed) {
            throw new common_1.BadRequestException('Cannot react to unrevealed answers');
        }
        const isPartOfCouple = answer.couple.userAId === userId || answer.couple.userBId === userId;
        if (!isPartOfCouple) {
            throw new common_1.BadRequestException('You are not part of this couple');
        }
        const reaction = await this.prisma.reaction.upsert({
            where: { answerId_userId: { answerId, userId } },
            update: { type },
            create: { answerId, userId, type },
        });
        await this.redis.publishEvent('reaction:added', {
            coupleId: answer.coupleId,
            answerId,
            userId,
            type,
        });
        return reaction;
    }
    async removeReaction(userId, answerId) {
        const existing = await this.prisma.reaction.findUnique({
            where: { answerId_userId: { answerId, userId } },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Reaction not found');
        }
        await this.prisma.reaction.delete({
            where: { id: existing.id },
        });
        return { removed: true };
    }
};
exports.ReactionService = ReactionService;
exports.ReactionService = ReactionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], ReactionService);
//# sourceMappingURL=reaction.service.js.map