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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const config_1 = require("@nestjs/config");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(reflector, config) {
        this.reflector = reflector;
        this.config = config;
        this.logger = new common_1.Logger('AuthGuard');
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing Authorization header');
        }
        try {
            const payload = await (0, clerk_sdk_node_1.verifyToken)(token, {
                secretKey: this.config.get('CLERK_SECRET_KEY'),
                issuer: null,
            });
            request.user = {
                sub: payload.sub,
                sessionId: payload.sid,
            };
            return true;
        }
        catch (error) {
            this.logger.error(`Clerk Token Verification Failed: ${error.message}`);
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map