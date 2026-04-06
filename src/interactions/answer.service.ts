import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StreakService } from '../couples/streak.service';
import { DailyQuestionStatus } from '@prisma/client';

export interface AnswerResult {
  status: 'WAITING_FOR_PARTNER' | 'REVEALED';
  answerId: string;
  answers?: Array<{
    id: string;
    userId: string;
    text: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class AnswerService {
  private readonly logger = new Logger(AnswerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly streakService: StreakService,
  ) {}

  async submitAnswer(
    userId: string,
    dailyQuestionId: string,
    text: string,
  ): Promise<AnswerResult> {
    const dailyQuestion = await this.prisma.dailyQuestion.findUnique({
      where: { id: dailyQuestionId },
      include: {
        couple: {
          select: { id: true, userAId: true, userBId: true, status: true, deletedAt: true },
        },
      },
    });

    if (!dailyQuestion) {
      throw new NotFoundException('Daily question not found');
    }

    const couple = dailyQuestion.couple;

    if (!couple || couple.deletedAt || couple.status !== 'ACTIVE') {
      throw new BadRequestException('Couple is not active');
    }

    const isUserA = couple.userAId === userId;
    const isUserB = couple.userBId === userId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not part of this couple');
    }

    const today = this.getUtcDateNormalized();
    const assignedDate = new Date(dailyQuestion.assignedDate);
    assignedDate.setUTCHours(0, 0, 0, 0);

    if (assignedDate.getTime() !== today.getTime()) {
      throw new BadRequestException('This question is not for today');
    }

    if (dailyQuestion.status === DailyQuestionStatus.EXPIRED) {
      throw new BadRequestException('This question has expired');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingAnswer = await tx.answer.findUnique({
        where: { dailyQuestionId_userId: { dailyQuestionId, userId } },
        select: { id: true },
      });

      if (existingAnswer) {
        throw new BadRequestException('You have already answered this question');
      }

      const answer = await tx.answer.create({
        data: {
          dailyQuestionId,
          coupleId: couple.id,
          userId,
          text: text.trim(),
        },
      });

      const allAnswers = await tx.answer.findMany({
        where: { dailyQuestionId },
        select: {
          id: true,
          userId: true,
          text: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const bothAnswered = allAnswers.length >= 2;

      const updateData: any = {};

      if (isUserA) {
        updateData.userAAnsweredAt = new Date();
      } else {
        updateData.userBAnsweredAt = new Date();
      }

      if (bothAnswered) {
        updateData.status = DailyQuestionStatus.COMPLETED;
      } else {
        updateData.status = DailyQuestionStatus.PARTIALLY_ANSWERED;
      }

      await tx.dailyQuestion.update({
        where: { id: dailyQuestionId },
        data: updateData,
      });

      return { answer, allAnswers, bothAnswered };
    });

    const partnerId = isUserA ? couple.userBId : couple.userAId;

    await this.redis.publish(
      `couple_${couple.id}`,
      JSON.stringify({
        type: 'PARTNER_ANSWERED',
        questionId: dailyQuestionId,
        userId,
        partnerId,
        bothAnswered: result.bothAnswered,
        timestamp: Date.now(),
      }),
    );

    if (result.bothAnswered) {
      this.streakService.recordInteraction(couple.id).catch((err) => {
        this.logger.error(`Failed to record streak for couple ${couple.id}`, err);
      });

      return {
        status: 'REVEALED',
        answerId: result.answer.id,
        answers: result.allAnswers.map((a) => ({
          id: a.id,
          userId: a.userId,
          text: a.text,
          createdAt: a.createdAt,
        })),
      };
    }

    return {
      status: 'WAITING_FOR_PARTNER',
      answerId: result.answer.id,
    };
  }

  async revealAnswers(userId: string, dailyQuestionId: string) {
    const dailyQuestion = await this.prisma.dailyQuestion.findUnique({
      where: { id: dailyQuestionId },
      include: {
        couple: { select: { id: true, userAId: true, userBId: true } },
        answers: {
          select: {
            id: true,
            userId: true,
            text: true,
            isRevealed: true,
            createdAt: true,
          },
        },
      },
    });

    if (!dailyQuestion) {
      throw new NotFoundException('Daily question not found');
    }

    const couple = dailyQuestion.couple;
    if (couple.userAId !== userId && couple.userBId !== userId) {
      throw new ForbiddenException('You are not part of this couple');
    }

    if (
      dailyQuestion.status !== DailyQuestionStatus.COMPLETED &&
      dailyQuestion.status !== DailyQuestionStatus.REVEALED
    ) {
      throw new BadRequestException('Both partners must answer before revealing');
    }

    if (dailyQuestion.status === DailyQuestionStatus.REVEALED) {
      return {
        answers: dailyQuestion.answers.map((a) => ({
          id: a.id,
          userId: a.userId,
          text: a.text,
          createdAt: a.createdAt,
        })),
      };
    }

    await this.prisma.$transaction([
      this.prisma.dailyQuestion.update({
        where: { id: dailyQuestionId },
        data: { status: DailyQuestionStatus.REVEALED, revealedAt: new Date() },
      }),
      this.prisma.answer.updateMany({
        where: { dailyQuestionId },
        data: { isRevealed: true },
      }),
    ]);

    await this.redis.publish(
      `couple_${couple.id}`,
      JSON.stringify({
        type: 'ANSWERS_REVEALED',
        questionId: dailyQuestionId,
        timestamp: Date.now(),
      }),
    );

    return {
      answers: dailyQuestion.answers.map((a) => ({
        id: a.id,
        userId: a.userId,
        text: a.text,
        createdAt: a.createdAt,
      })),
    };
  }

  private getUtcDateNormalized(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
