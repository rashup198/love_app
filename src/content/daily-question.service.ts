import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';
import { DailyQuestionStatus, ContentTier } from '@prisma/client';

@Injectable()
export class DailyQuestionService {
  private readonly logger = new Logger(DailyQuestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

  async getTodaysQuestion(coupleId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyQuestion = await this.prisma.dailyQuestion.findUnique({
      where: { coupleId_assignedDate: { coupleId, assignedDate: today } },
      include: { question: true },
    });

    if (!dailyQuestion) {
      dailyQuestion = await this.assignDailyQuestion(coupleId, today);
    }

    return dailyQuestion;
  }

  async assignDailyQuestion(coupleId: string, date: Date) {
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
      include: {
        userA: { include: { subscription: { include: { plan: true } } } },
        userB: { include: { subscription: { include: { plan: true } } } },
      },
    });

    if (!couple) {
      throw new NotFoundException('Couple not found');
    }

    const hasPremium =
      couple.userA.subscription?.plan.tier === 'PREMIUM' ||
      couple.userB.subscription?.plan.tier === 'PREMIUM';

    const tier = hasPremium ? ContentTier.PREMIUM : ContentTier.FREE;
    const question = await this.contentService.selectQuestionForCouple(coupleId, tier);

    if (!question) {
      throw new NotFoundException('No available questions');
    }

    const dailyQuestion = await this.prisma.dailyQuestion.create({
      data: {
        coupleId,
        questionId: question.id,
        assignedDate: date,
        status: DailyQuestionStatus.PENDING,
      },
      include: { question: true },
    });

    await this.prisma.question.update({
      where: { id: question.id },
      data: { usageCount: { increment: 1 } },
    });

    return dailyQuestion;
  }

  async assignDailyQuestionsForAllCouples() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeCouples = await this.prisma.couple.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    let assigned = 0;
    for (const couple of activeCouples) {
      try {
        const existing = await this.prisma.dailyQuestion.findUnique({
          where: { coupleId_assignedDate: { coupleId: couple.id, assignedDate: today } },
        });

        if (!existing) {
          await this.assignDailyQuestion(couple.id, today);
          assigned++;
        }
      } catch (error) {
        this.logger.error(`Failed to assign question for couple ${couple.id}`, error);
      }
    }

    this.logger.log(`Assigned daily questions to ${assigned} couples`);
    return { assigned };
  }

  async getQuestionHistory(coupleId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.dailyQuestion.findMany({
        where: { coupleId },
        include: {
          question: true,
          answers: {
            include: {
              user: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
              reactions: true,
            },
          },
        },
        orderBy: { assignedDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dailyQuestion.count({ where: { coupleId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
