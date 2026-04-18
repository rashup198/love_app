"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouplesModule = void 0;
const common_1 = require("@nestjs/common");
const couples_controller_1 = require("./couples.controller");
const couples_service_1 = require("./couples.service");
const streak_service_1 = require("./streak.service");
const invite_service_1 = require("./invite.service");
const events_module_1 = require("../events/events.module");
let CouplesModule = class CouplesModule {
};
exports.CouplesModule = CouplesModule;
exports.CouplesModule = CouplesModule = __decorate([
    (0, common_1.Module)({
        imports: [events_module_1.EventsModule],
        controllers: [couples_controller_1.CouplesController],
        providers: [couples_service_1.CouplesService, streak_service_1.StreakService, invite_service_1.InviteService],
        exports: [couples_service_1.CouplesService, streak_service_1.StreakService, invite_service_1.InviteService],
    })
], CouplesModule);
//# sourceMappingURL=couples.module.js.map