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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const svix_1 = require("svix");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
let AuthController = class AuthController {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger('ClerkWebhook');
    }
    async handleWebhook(req, headers) {
        const WEBHOOK_SECRET = this.config.get('CLERK_WEBHOOK_SECRET');
        if (!WEBHOOK_SECRET) {
            this.logger.error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
            throw new common_1.BadRequestException('Webhook configuration missing');
        }
        const svix_id = headers['svix-id'];
        const svix_timestamp = headers['svix-timestamp'];
        const svix_signature = headers['svix-signature'];
        if (!svix_id || !svix_timestamp || !svix_signature) {
            throw new common_1.BadRequestException('Missing svix headers');
        }
        const payload = JSON.stringify(req.body);
        const wh = new svix_1.Webhook(WEBHOOK_SECRET);
        let evt;
        try {
            evt = wh.verify(payload, {
                'svix-id': svix_id,
                'svix-timestamp': svix_timestamp,
                'svix-signature': svix_signature,
            });
        }
        catch (err) {
            this.logger.error('Error verifying webhook:', err.message);
            throw new common_1.BadRequestException('Invalid signature');
        }
        if (evt.type === 'user.created') {
            const { id, email_addresses } = evt.data;
            const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses[0]?.email_address;
            this.logger.log(`New user synced from Clerk: ${id} (${primaryEmail})`);
            await this.prisma.user.upsert({
                where: { id },
                update: {
                    email: primaryEmail,
                },
                create: {
                    id,
                    email: primaryEmail,
                    isOnboarded: false,
                },
            });
        }
        if (evt.type === 'user.deleted') {
            const { id } = evt.data;
            await this.prisma.user.delete({ where: { id } }).catch(() => null);
        }
        return { received: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "handleWebhook", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('webhooks/clerk'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map