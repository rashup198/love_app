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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRelationshipDto = exports.JoinCoupleDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class JoinCoupleDto {
}
exports.JoinCoupleDto = JoinCoupleDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Invite code must be a string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Invite code is required' }),
    (0, class_validator_1.Length)(6, 8, { message: 'Invite code must be between 6 and 8 characters' }),
    (0, class_validator_1.Matches)(/^[A-Z0-9]+$/, { message: 'Invite code must be uppercase alphanumeric' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value),
    __metadata("design:type", String)
], JoinCoupleDto.prototype, "inviteCode", void 0);
class UpdateRelationshipDto {
}
exports.UpdateRelationshipDto = UpdateRelationshipDto;
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Must be a valid ISO date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Start date is required' }),
    __metadata("design:type", String)
], UpdateRelationshipDto.prototype, "startDate", void 0);
//# sourceMappingURL=couples.dto.js.map