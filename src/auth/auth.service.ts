import { Injectable, UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ADMIN_SETUP_TOKEN } from '../config/admin.config';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
  ) {}

  validateAdminSetupToken(token: string | undefined | null): boolean {
    if (!token) {
      return false;
    }
    return token === ADMIN_SETUP_TOKEN;
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user || user.password !== password) {
      const message = await this.i18n.translate(
        'errors.auth.invalid_credentials',
      );
      throw new UnauthorizedException(message);
    }
    return user;
  }

  async login(user: User): Promise<{ accessToken: string }> {
    const payload = { sub: user.id, email: user.email, type: user.type };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}

