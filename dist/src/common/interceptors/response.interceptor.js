"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let ResponseInterceptor = class ResponseInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)((data) => {
            if (data instanceof common_1.StreamableFile) {
                return data;
            }
            return {
                success: true,
                data: data ?? null,
                error: null,
            };
        }), (0, operators_1.catchError)((err) => {
            const status = err instanceof common_1.HttpException ? err.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            const response = err instanceof common_1.HttpException ? err.getResponse() : null;
            let errorMessage = 'Internal server error';
            if (typeof response === 'string') {
                errorMessage = response;
            }
            else if (typeof response === 'object' && response !== null && 'message' in response) {
                const msg = response.message;
                errorMessage = Array.isArray(msg) ? msg.join(', ') : String(msg);
            }
            const httpAdapter = context.switchToHttp();
            const res = httpAdapter.getResponse();
            if (res && typeof res.status === 'function') {
                res.status(status).json({
                    success: false,
                    data: null,
                    error: errorMessage,
                });
                return new rxjs_1.Observable();
            }
            return (0, rxjs_1.throwError)(() => err);
        }));
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseInterceptor);
//# sourceMappingURL=response.interceptor.js.map