import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestOtpDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
  email: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
  email: string;

  @IsString({ message: 'OTP code must be a string' })
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
