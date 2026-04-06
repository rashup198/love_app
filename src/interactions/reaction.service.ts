import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ReactionType } from '@prisma/client';

@Injectable()
export class ReactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async addReaction(userId: string, answerId: string, type: ReactionType) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      include: { couple: true },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    if (!answer.isRevealed) {
      throw new BadRequestException('Cannot react to unrevealed answers');
    }

    const isPartOfCouple = answer.couple.userAId === userId || answer.couple.userBId === userId;
    if (!isPartOfCouple) {
      throw new BadRequestException('You are not part of this couple');
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

  async removeReaction(userId: string, answerId: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: { answerId_userId: { answerId, userId } },
    });

    if (!existing) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.reaction.delete({
      where: { id: existing.id },
    });

    return { removed: true };
  }
}
