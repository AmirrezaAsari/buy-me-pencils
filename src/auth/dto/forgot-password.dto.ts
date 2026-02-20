import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class ForgotPasswordRequestOtpDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(10)
  code: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}
