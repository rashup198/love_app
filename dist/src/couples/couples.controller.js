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
exports.CouplesController = void 0;
const common_1 = require("@nestjs/common");
const couples_service_1 = require("./couples.service");
const invite_service_1 = require("./invite.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const couples_dto_1 = require("./dto/couples.dto");
let CouplesController = class CouplesController {
    constructor(couplesService, inviteService) {
        this.couplesService = couplesService;
        this.inviteService = inviteService;
    }
    async getCouple(user) {
        return this.couplesService.getCouple(user.sub);
    }
    async joinCouple(user, dto) {
        return this.couplesService.joinCouple(dto.inviteCode, user.sub);
    }
    async createInvite(user) {
        return this.inviteService.createInvite(user.sub);
    }
    async updateRelationshipDate(user, dto) {
        return this.couplesService.updateRelationshipDate(user.sub, dto.startDate);
    }
    async dissolveCouple(user) {
        return this.couplesService.dissolveCouple(user.sub);
    }
};
exports.CouplesController = CouplesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CouplesController.prototype, "getCouple", null);
__decorate([
    (0, common_1.Post)('join'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, couples_dto_1.JoinCoupleDto]),
    __metadata("design:returntype", Promise)
], CouplesController.prototype, "joinCouple", null);
__decorate([
    (0, common_1.Post)('invite-code'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CouplesController.prototype, "createInvite", null);
__decorate([
    (0, common_1.Post)('relationship-date'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, couples_dto_1.UpdateRelationshipDto]),
    __metadata("design:returntype", Promise)
], CouplesController.prototype, "updateRelationshipDate", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CouplesController.prototype, "dissolveCouple", null);
exports.CouplesController = CouplesController = __decorate([
    (0, common_1.Controller)('couples'),
    __metadata("design:paramtypes", [couples_service_1.CouplesService,
        invite_service_1.InviteService])
], CouplesController);
//# sourceMappingURL=couples.controller.js.map