"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionsModule = void 0;
const common_1 = require("@nestjs/common");
const interactions_controller_1 = require("./interactions.controller");
const answer_service_1 = require("./answer.service");
const reaction_service_1 = require("./reaction.service");
const message_service_1 = require("./message.service");
const couples_module_1 = require("../couples/couples.module");
let InteractionsModule = class InteractionsModule {
};
exports.InteractionsModule = InteractionsModule;
exports.InteractionsModule = InteractionsModule = __decorate([
    (0, common_1.Module)({
        imports: [couples_module_1.CouplesModule],
        controllers: [interactions_controller_1.InteractionsController],
        providers: [answer_service_1.AnswerService, reaction_service_1.ReactionService, message_service_1.MessageService],
        exports: [answer_service_1.AnswerService],
    })
], InteractionsModule);
//# sourceMappingURL=interactions.module.js.map