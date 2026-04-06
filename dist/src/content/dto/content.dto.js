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
exports.BulkCreateQuestionsDto = exports.GetQuestionsDto = exports.CreateQuestionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CreateQuestionDto {
}
exports.CreateQuestionDto = CreateQuestionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.QuestionCategory),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ContentTier),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "tier", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "sortOrder", void 0);
class GetQuestionsDto {
}
exports.GetQuestionsDto = GetQuestionsDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.QuestionCategory),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetQuestionsDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ContentTier),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetQuestionsDto.prototype, "tier", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GetQuestionsDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GetQuestionsDto.prototype, "limit", void 0);
class BulkQuestionItem {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], BulkQuestionItem.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.QuestionCategory),
    __metadata("design:type", String)
], BulkQuestionItem.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ContentTier),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkQuestionItem.prototype, "tier", void 0);
class BulkCreateQuestionsDto {
}
exports.BulkCreateQuestionsDto = BulkCreateQuestionsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkQuestionItem),
    __metadata("design:type", Array)
], BulkCreateQuestionsDto.prototype, "questions", void 0);
//# sourceMappingURL=content.dto.js.map