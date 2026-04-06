import { AuthService } from './auth.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    requestOtp(dto: RequestOtpDto): Promise<{
        sent: boolean;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<import("./auth.service").AuthResponse>;
    refresh(dto: RefreshTokenDto): Promise<import("./auth.service").TokenPair>;
    logout(user: JwtPayload): Promise<{
        loggedOut: boolean;
    }>;
    generateInviteCode(user: JwtPayload): Promise<{
        inviteCode: string;
    }>;
}
