import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ADMIN_SETUP_TOKEN } from '../config/admin.config';
import { User } from '../users/user.entity'
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
}

