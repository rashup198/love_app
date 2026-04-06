import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordInteraction(coupleId: string) {
    const couple = await this.prisma.couple.findUnique({ where: { id: coupleId } });
    if (!couple) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastInteraction = couple.lastInteractionDate
      ? new Date(couple.lastInteractionDate)
      : null;

    let newStreak = couple.currentStreak;

    if (!lastInteraction) {
      newStreak = 1;
    } else {
      lastInteraction.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (today.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        return;
      } else if (diffDays === 1) {
        newStreak = couple.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(newStreak, couple.longestStreak);

    await this.prisma.couple.update({
      where: { id: coupleId },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastInteractionDate: today,
        totalInteractions: { increment: 1 },
      },
    });

    this.logger.log(`Streak updated for couple ${coupleId}: ${newStreak} days`);
  }

  async checkAndResetBrokenStreaks() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const brokenStreaks = await this.prisma.couple.updateMany({
      where: {
        currentStreak: { gt: 0 },
        lastInteractionDate: { lt: yesterday },
        deletedAt: null,
      },
      data: { currentStreak: 0 },
    });

    this.logger.log(`Reset ${brokenStreaks.count} broken streaks`);
    return brokenStreaks.count;
  }
}
