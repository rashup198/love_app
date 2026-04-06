import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class JwtAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly jwt;
    private readonly config;
    private readonly jwtSecret;
    constructor(reflector: Reflector, jwt: JwtService, config: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
