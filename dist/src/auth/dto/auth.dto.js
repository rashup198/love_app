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
exports.RefreshTokenDto = exports.VerifyOtpDto = exports.RequestOtpDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class RequestOtpDto {
}
exports.RequestOtpDto = RequestOtpDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Must be a valid email address' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value),
    __metadata("design:type", String)
], RequestOtpDto.prototype, "email", void 0);
class VerifyOtpDto {
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Must be a valid email address' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'OTP code must be a string' }),
    (0, class_validator_1.Length)(6, 6, { message: 'OTP code must be exactly 6 digits' }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "code", void 0);
class RefreshTokenDto {
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Refresh token must be a string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Refresh token is required' }),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
//# sourceMappingURL=auth.dto.js.map