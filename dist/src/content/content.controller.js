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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
const common_1 = require("@nestjs/common");
const content_service_1 = require("./content.service");
const daily_question_service_1 = require("./daily-question.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const content_dto_1 = require("./dto/content.dto");
let ContentController = class ContentController {
    constructor(contentService, dailyQuestionService) {
        this.contentService = contentService;
        this.dailyQuestionService = dailyQuestionService;
    }
    async getQuestions(query) {
        return this.contentService.getQuestions(query);
    }
    async createQuestion(dto) {
        return this.contentService.createQuestion(dto);
    }
    async bulkCreateQuestions(dto) {
        return this.contentService.bulkCreateQuestions(dto.questions);
    }
    async getTodaysQuestion(user) {
        return this.contentService.getDailyQuestion(user.sub);
    }
    async getQuestionHistory(user, page, limit) {
        const coupleId = user.coupleId;
        if (!coupleId) {
            return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        }
        return this.dailyQuestionService.getQuestionHistory(coupleId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
    }
};
exports.ContentController = ContentController;
__decorate([
    (0, common_1.Get)('questions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [content_dto_1.GetQuestionsDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "getQuestions", null);
__decorate([
    (0, common_1.Post)('questions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [content_dto_1.CreateQuestionDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Post)('questions/bulk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [content_dto_1.BulkCreateQuestionsDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "bulkCreateQuestions", null);
__decorate([
    (0, common_1.Get)('daily'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "getTodaysQuestion", null);
__decorate([
    (0, common_1.Get)('daily/history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "getQuestionHistory", null);
exports.ContentController = ContentController = __decorate([
    (0, common_1.Controller)('content'),
    __metadata("design:paramtypes", [content_service_1.ContentService,
        daily_question_service_1.DailyQuestionService])
], ContentController);
//# sourceMappingURL=content.controller.js.map