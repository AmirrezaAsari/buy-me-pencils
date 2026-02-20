import { IsEmail } from 'class-validator';

export class SignUpRequestOtpDto {
  @IsEmail()
  email: string;
}
