import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { InviteStatus, CoupleStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class InviteService {
  private readonly INVITE_EXPIRY_HOURS = 48;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createInvite(senderId: string) {
    const existingCouple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: senderId }, { userBId: senderId }],
        deletedAt: null,
        status: { not: CoupleStatus.DISSOLVED },
      },
    });

    if (existingCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const pendingInvite = await this.prisma.coupleInvite.findFirst({
      where: { senderId, status: InviteStatus.PENDING },
    });

    if (pendingInvite) {
      return { inviteCode: pendingInvite.inviteCode, expiresAt: pendingInvite.expiresAt };
    }

    const inviteCode = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + this.INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const invite = await this.prisma.coupleInvite.create({
      data: {
        senderId,
        inviteCode,
        expiresAt,
      },
    });

    await this.redis.setWithExpiry(
      `invite:${inviteCode}`,
      senderId,
      this.INVITE_EXPIRY_HOURS * 3600,
    );

    return { inviteCode: invite.inviteCode, expiresAt: invite.expiresAt };
  }

  async acceptInvite(receiverId: string, inviteCode: string) {
    const invite = await this.prisma.coupleInvite.findUnique({
      where: { inviteCode },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Invite is no longer active');
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.coupleInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Invite has expired');
    }

    if (invite.senderId === receiverId) {
      throw new BadRequestException('Cannot accept your own invite');
    }

    const existingCouple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: receiverId }, { userBId: receiverId }],
        deletedAt: null,
        status: { not: CoupleStatus.DISSOLVED },
      },
    });

    if (existingCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const [couple] = await this.prisma.$transaction([
      this.prisma.couple.create({
        data: {
          userAId: invite.senderId,
          userBId: receiverId,
          status: CoupleStatus.ACTIVE,
        },
      }),
      this.prisma.coupleInvite.update({
        where: { id: invite.id },
        data: {
          receiverId,
          status: InviteStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      }),
      this.prisma.coupleInvite.updateMany({
        where: {
          senderId: invite.senderId,
          status: InviteStatus.PENDING,
          id: { not: invite.id },
        },
        data: { status: InviteStatus.CANCELLED },
      }),
    ]);

    await this.redis.del(`invite:${inviteCode}`);

    return {
      coupleId: couple.id,
      partnerId: invite.senderId,
    };
  }

  async cancelInvite(senderId: string, inviteCode: string) {
    const invite = await this.prisma.coupleInvite.findFirst({
      where: { senderId, inviteCode, status: InviteStatus.PENDING },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.coupleInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.CANCELLED },
    });

    await this.redis.del(`invite:${inviteCode}`);

    return { cancelled: true };
  }
}
