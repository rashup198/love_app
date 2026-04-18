import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoupleStatus, InviteStatus } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CouplesService {
  private readonly logger = new Logger(CouplesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async joinCouple(inviteCode: string, userId: string) {
    const invite = await this.prisma.coupleInvite.findUnique({
      where: { inviteCode },
    });

    if (!invite) {
      throw new NotFoundException('Invite code not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('This invite code is no longer active');
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.coupleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('This invite code has expired');
    }

    if (invite.senderId === userId) {
      throw new BadRequestException('You cannot join your own invite code');
    }

    const couple = await this.prisma.$transaction(async (tx) => {
      const senderCouple = await tx.couple.findFirst({
        where: {
          OR: [{ userAId: invite.senderId }, { userBId: invite.senderId }],
          deletedAt: null,
          status: { not: CoupleStatus.DISSOLVED },
        },
        select: { id: true },
      });

      if (senderCouple) {
        throw new ConflictException('The invite sender is already in a couple');
      }

      const receiverCouple = await tx.couple.findFirst({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          deletedAt: null,
          status: { not: CoupleStatus.DISSOLVED },
        },
        select: { id: true },
      });

      if (receiverCouple) {
        throw new ConflictException('You are already in a couple');
      }

      const senderUser = await tx.user.findUnique({
        where: { id: invite.senderId },
        select: { id: true, deletedAt: true },
      });

      if (!senderUser || senderUser.deletedAt) {
        throw new BadRequestException('The invite sender account is no longer available');
      }

      const newCouple = await tx.couple.create({
        data: {
          userAId: invite.senderId,
          userBId: userId,
          status: CoupleStatus.ACTIVE,
          currentStreak: 0,
          longestStreak: 0,
          totalInteractions: 0,
        },
      });

      await tx.coupleInvite.update({
        where: { id: invite.id },
        data: {
          receiverId: userId,
          status: InviteStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      await tx.coupleInvite.updateMany({
        where: {
          senderId: invite.senderId,
          status: InviteStatus.PENDING,
          id: { not: invite.id },
        },
        data: { status: InviteStatus.CANCELLED },
      });

      await tx.coupleInvite.updateMany({
        where: {
          senderId: userId,
          status: InviteStatus.PENDING,
        },
        data: { status: InviteStatus.CANCELLED },
      });

      return newCouple;
    });

    this.logger.log(`Couple created: ${couple.id} (${invite.senderId} + ${userId})`);

    await this.redis.publish(
      `couple_pairing`,
      JSON.stringify({
        type: 'COUPLE_PAIRED',
        coupleId: couple.id,
        user1Id: invite.senderId,
        user2Id: userId,
        timestamp: Date.now(),
      })
    );

    return {
      coupleId: couple.id,
      partnerId: invite.senderId,
      status: couple.status,
      currentStreak: couple.currentStreak,
      createdAt: couple.createdAt,
    };
  }

  async getCouple(userId: string) {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: { not: CoupleStatus.DISSOLVED },
      },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    if (!couple) {
      throw new NotFoundException('No active couple found');
    }

    const partner = couple.userAId === userId ? couple.userB : couple.userA;

    return {
      id: couple.id,
      status: couple.status,
      partner: {
        id: partner.id,
        displayName: partner.profile?.displayName ?? null,
        avatarUrl: partner.profile?.avatarUrl ?? null,
      },
      relationshipStartDate: couple.relationshipStartDate,
      currentStreak: couple.currentStreak,
      longestStreak: couple.longestStreak,
      totalInteractions: couple.totalInteractions,
      createdAt: couple.createdAt,
    };
  }

  async getCoupleId(userId: string): Promise<string | null> {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: CoupleStatus.ACTIVE,
      },
      select: { id: true },
    });

    return couple?.id ?? null;
  }

  async getPartnerId(userId: string): Promise<string | null> {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: CoupleStatus.ACTIVE,
      },
      select: { userAId: true, userBId: true },
    });

    if (!couple) return null;
    return couple.userAId === userId ? couple.userBId : couple.userAId;
  }

  async updateRelationshipDate(userId: string, startDate: string) {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: CoupleStatus.ACTIVE,
      },
    });

    if (!couple) {
      throw new NotFoundException('No active couple found');
    }

    return this.prisma.couple.update({
      where: { id: couple.id },
      data: { relationshipStartDate: new Date(startDate) },
    });
  }

  async dissolveCouple(userId: string) {
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: CoupleStatus.ACTIVE,
      },
    });

    if (!couple) {
      throw new BadRequestException('No active couple to dissolve');
    }

    await this.prisma.couple.update({
      where: { id: couple.id },
      data: { status: CoupleStatus.DISSOLVED, deletedAt: new Date() },
    });

    return { dissolved: true };
  }
}
