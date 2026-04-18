import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { profile: true, subscription: { include: { plan: true } } },
    });

    if (!user) {
      try {
        const { createClerkClient } = require('@clerk/clerk-sdk-node');
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerkClient.users.getUser(userId);
        const primaryEmail =
          clerkUser.emailAddresses.find((e: any) => e.id === clerkUser.primaryEmailAddressId)
            ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

        if (primaryEmail) {
          user = await this.prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
              email: primaryEmail,
              isOnboarded: false,
            },
            include: { profile: true, subscription: { include: { plan: true } } },
          });
        }
      } catch (e) {
        console.error('Failed to lazy sync user from clerk:', e);
      }
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch active couple + partner info
    const couple = await this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    let coupleData = null;
    let coupleId: string | null = null;

    if (couple) {
      coupleId = couple.id;
      const partner = couple.userAId === userId ? couple.userB : couple.userA;
      coupleData = {
        id: couple.id,
        status: couple.status,
        partner: {
          id: partner.id,
          displayName: partner.profile?.displayName ?? null,
          avatarUrl: partner.profile?.avatarUrl ?? null,
        },
        currentStreak: couple.currentStreak,
        longestStreak: couple.longestStreak,
        totalInteractions: couple.totalInteractions,
        createdAt: couple.createdAt,
      };
    }

    // Look up any pending invite code for this user
    const pendingInvite = await this.prisma.coupleInvite.findFirst({
      where: { senderId: userId, status: 'PENDING' },
      select: { inviteCode: true },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
        coupleId,
        inviteCode: pendingInvite?.inviteCode ?? null,
      },
      couple: coupleData,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bio: dto.bio,
        timezone: dto.timezone,
      },
      create: {
        userId,
        displayName: dto.displayName ?? '',
        avatarUrl: dto.avatarUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bio: dto.bio,
        timezone: dto.timezone ?? 'UTC',
      },
    });

    if (!user.isOnboarded && dto.displayName) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnboarded: true },
      });
    }

    return profile;
  }

  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });



    return { deactivated: true };
  }

  async updateLastActive(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  }
}
