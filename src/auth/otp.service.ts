import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OtpPurpose } from '@prisma/client';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string, purpose: OtpPurpose): Promise<{ code: string }> {
    await this.prisma.otp.updateMany({
      where: { userId, purpose, isUsed: false },
      data: { isUsed: true },
    });

    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otp.create({
      data: {
        userId,
        code,
        purpose,
        expiresAt,
        maxAttempts: this.MAX_ATTEMPTS,
      },
    });

    return { code };
  }

  async verify(userId: string, code: string, purpose: OtpPurpose): Promise<boolean> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return false;
    }

    if (otp.attempts >= otp.maxAttempts) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { isUsed: true },
      });
      return false;
    }

    if (otp.code !== code) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    return true;
  }

  private generateSecureCode(): string {
    const array = new Uint32Array(1);
    require('crypto').getRandomValues(array);
    return String(array[0] % 1000000).padStart(6, '0');
  }
}
