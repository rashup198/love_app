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
exports.InteractionsController = void 0;
const common_1 = require("@nestjs/common");
const answer_service_1 = require("./answer.service");
const reaction_service_1 = require("./reaction.service");
const message_service_1 = require("./message.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const interactions_dto_1 = require("./dto/interactions.dto");
let InteractionsController = class InteractionsController {
    constructor(answerService, reactionService, messageService) {
        this.answerService = answerService;
        this.reactionService = reactionService;
        this.messageService = messageService;
    }
    async submitAnswer(user, dto) {
        return this.answerService.submitAnswer(user.sub, dto.dailyQuestionId, dto.text);
    }
    async revealAnswers(user, dailyQuestionId) {
        return this.answerService.revealAnswers(user.sub, dailyQuestionId);
    }
    async addReaction(user, dto) {
        return this.reactionService.addReaction(user.sub, dto.answerId, dto.type);
    }
    async removeReaction(user, answerId) {
        return this.reactionService.removeReaction(user.sub, answerId);
    }
    async sendMessage(user, dto) {
        return this.messageService.sendMessage(user.sub, dto.coupleId, dto.content, dto.type);
    }
    async getMessages(coupleId, page, limit) {
        return this.messageService.getMessages(coupleId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
    }
    async markAsRead(user, coupleId) {
        return this.messageService.markAsRead(user.sub, coupleId);
    }
    async deleteMessage(user, id) {
        return this.messageService.deleteMessage(user.sub, id);
    }
};
exports.InteractionsController = InteractionsController;
__decorate([
    (0, common_1.Post)('answers'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, interactions_dto_1.SubmitAnswerDto]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "submitAnswer", null);
__decorate([
    (0, common_1.Post)('answers/:dailyQuestionId/reveal'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('dailyQuestionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "revealAnswers", null);
__decorate([
    (0, common_1.Post)('reactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, interactions_dto_1.AddReactionDto]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)('reactions/:answerId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('answerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "removeReaction", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, interactions_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, common_1.Query)('coupleId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('messages/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('coupleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Delete)('messages/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InteractionsController.prototype, "deleteMessage", null);
exports.InteractionsController = InteractionsController = __decorate([
    (0, common_1.Controller)('interactions'),
    __metadata("design:paramtypes", [answer_service_1.AnswerService,
        reaction_service_1.ReactionService,
        message_service_1.MessageService])
], InteractionsController);
//# sourceMappingURL=interactions.controller.js.map