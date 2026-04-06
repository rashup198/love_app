import { PrismaService } from '../prisma/prisma.service';
import { OtpPurpose } from '@prisma/client';
export declare class OtpService {
    private readonly prisma;
    private readonly logger;
    private readonly OTP_EXPIRY_MINUTES;
    private readonly MAX_ATTEMPTS;
    constructor(prisma: PrismaService);
    generate(userId: string, purpose: OtpPurpose): Promise<{
        code: string;
    }>;
    verify(userId: string, code: string, purpose: OtpPurpose): Promise<boolean>;
    private generateSecureCode;
}
