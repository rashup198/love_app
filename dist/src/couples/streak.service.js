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
var StreakService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StreakService = StreakService_1 = class StreakService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(StreakService_1.name);
    }
    async recordInteraction(coupleId) {
        const couple = await this.prisma.couple.findUnique({ where: { id: coupleId } });
        if (!couple)
            return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastInteraction = couple.lastInteractionDate
            ? new Date(couple.lastInteractionDate)
            : null;
        let newStreak = couple.currentStreak;
        if (!lastInteraction) {
            newStreak = 1;
        }
        else {
            lastInteraction.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return;
            }
            else if (diffDays === 1) {
                newStreak = couple.currentStreak + 1;
            }
            else {
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
};
exports.StreakService = StreakService;
exports.StreakService = StreakService = StreakService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StreakService);
//# sourceMappingURL=streak.service.js.map