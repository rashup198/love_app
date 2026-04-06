"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OtpService = OtpService_1 = class OtpService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(OtpService_1.name);
        this.OTP_EXPIRY_MINUTES = 10;
        this.MAX_ATTEMPTS = 5;
    }
    async generate(userId, purpose) {
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
    async verify(userId, code, purpose) {
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
    generateSecureCode() {
        const array = new Uint32Array(1);
        require('crypto').getRandomValues(array);
        return String(array[0] % 1000000).padStart(6, '0');
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OtpService);
//# sourceMappingURL=otp.service.js.map