import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ADMIN_SETUP_TOKEN } from '../config/admin.config';
import { User } from '../users/user.entity';
import { Otp } from './entities/otp.entity';
import { MailService } from '../mail/mail.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
  ) {}

  validateAdminSetupToken(token: string | undefined | null): boolean {
    if (!token) {
      return false;
    }
    return token === ADMIN_SETUP_TOKEN;
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: User): Promise<{ accessToken: string }> {
    const payload = { sub: user.id, email: user.email, type: user.type };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  private generateOtpCode(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  async requestSignUpOtp(email: string): Promise<{ message: string }> {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    await this.otpRepository.delete({ email, purpose: 'signup' });
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.otpRepository.save(
      this.otpRepository.create({ email, code, purpose: 'signup', expiresAt }),
    );
    await this.mailService.sendOtpEmail(email, code, 'signup');
    return { message: 'Verification code sent to your email' };
  }

  async verifySignUp(
    email: string,
    code: string,
    name: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const otp = await this.otpRepository.findOne({
      where: { email, purpose: 'signup' },
      order: { createdAt: 'DESC' },
    });
    if (!otp) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    if (new Date() > otp.expiresAt) {
      await this.otpRepository.remove(otp);
      throw new BadRequestException('Verification code has expired');
    }
    if (otp.code !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      name,
      password: hashedPassword,
      type: 'user',
    });
    const saved = await this.usersRepository.save(user);
    await this.otpRepository.remove(otp);

    return this.login(saved);
  }

  async requestForgotPasswordOtp(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return { message: 'If an account exists with this email, a code has been sent' };
    }

    await this.otpRepository.delete({ email, purpose: 'forgot_password' });
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.otpRepository.save(
      this.otpRepository.create({
        email,
        code,
        purpose: 'forgot_password',
        expiresAt,
      }),
    );
    await this.mailService.sendOtpEmail(email, code, 'forgot_password');
    return { message: 'If an account exists with this email, a code has been sent' };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const otp = await this.otpRepository.findOne({
      where: { email, purpose: 'forgot_password' },
      order: { createdAt: 'DESC' },
    });
    if (!otp) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    if (new Date() > otp.expiresAt) {
      await this.otpRepository.remove(otp);
      throw new BadRequestException('Verification code has expired');
    }
    if (otp.code !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    await this.otpRepository.remove(otp);
    return { message: 'Password has been reset successfully' };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
