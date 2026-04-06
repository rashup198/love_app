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
var MoodService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoodService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let MoodService = MoodService_1 = class MoodService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(MoodService_1.name);
    }
    async logMood(userId, mood, note) {
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
    async getMoodHistory(userId, days = 30) {
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
    async getTodaysMood(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.moodLog.findUnique({
            where: { userId_date: { userId, date: today } },
        });
    }
    async getPartnerMood(partnerId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mood = await this.prisma.moodLog.findUnique({
            where: { userId_date: { userId: partnerId, date: today } },
        });
        if (!mood)
            return null;
        return { mood: mood.mood, date: mood.date };
    }
};
exports.MoodService = MoodService;
exports.MoodService = MoodService = MoodService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], MoodService);
//# sourceMappingURL=mood.service.js.map