import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
export declare class AuthController {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService);
    handleWebhook(req: Request, headers: any): Promise<{
        received: boolean;
    }>;
}
