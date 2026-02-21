import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpRequestOtpDto } from './dto/sign-up-request-otp.dto';
import { VerifySignUpDto } from './dto/verify-sign-up.dto';
import {
  ForgotPasswordRequestOtpDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { UserGuard } from './guards/user.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('sign-in')
  async signIn(@Body() body: SignInDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('sign-up/request-otp')
  async signUpRequestOtp(@Body() body: SignUpRequestOtpDto) {
    return this.authService.requestSignUpOtp(body.email);
  }

  @Post('sign-up/verify')
  async signUpVerify(@Body() body: VerifySignUpDto) {
    return this.authService.verifySignUp(
      body.email,
      body.code,
      body.name,
      body.password,
    );
  }

  @Post('forgot-password/request-otp')
  async forgotPasswordRequestOtp(@Body() body: ForgotPasswordRequestOtpDto) {
    return this.authService.requestForgotPasswordOtp(body.email);
  }

  @Post('forgot-password/reset')
  async forgotPasswordReset(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }

  @Get('me')
  @UseGuards(UserGuard)
  me(@CurrentUser() user: User) {
    return { id: user.id, email: user.email, name: user.name, type: user.type };
  }

  @Patch('profile')
  @UseGuards(UserGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user.id, body);
  }
}
