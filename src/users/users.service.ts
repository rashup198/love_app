import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { profile: true, subscription: { include: { plan: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      isOnboarded: user.isOnboarded,
      lastActiveAt: user.lastActiveAt,
      profile: user.profile,
      subscription: user.subscription
        ? {
            tier: user.subscription.plan.tier,
            status: user.subscription.status,
            expiresAt: user.subscription.currentPeriodEnd,
          }
        : null,
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
