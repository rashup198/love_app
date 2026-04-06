import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MoodLevel } from '@prisma/client';

@Injectable()
export class MoodService {
  private readonly logger = new Logger(MoodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async logMood(userId: string, mood: MoodLevel, note?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const moodLog = await this.prisma.moodLog.upsert({
      where: { userId_date: { userId, date: today } },
      update: { mood, note },
      create: { userId, mood, note, date: today },
    });

    await this.redis.publishEvent('mood:logged', { userId, mood });

    return moodLog;
  }

  async getMoodHistory(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await this.prisma.moodLog.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    return { logs, totalDays: days, loggedDays: logs.length };
  }

  async getTodaysMood(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.moodLog.findUnique({
      where: { userId_date: { userId, date: today } },
    });
  }

  async getPartnerMood(partnerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mood = await this.prisma.moodLog.findUnique({
      where: { userId_date: { userId: partnerId, date: today } },
    });

    if (!mood) return null;

    return { mood: mood.mood, date: mood.date };
  }
}
