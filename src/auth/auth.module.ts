import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/user.entity';
import { Otp } from './entities/otp.entity';
import { MailModule } from '../mail/mail.module';
import { UserGuard } from './guards/user.guard';
import { AdminGuard } from './guards/admin.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp]),
    MailModule,
    forwardRef(() => UsersModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-this-jwt-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserGuard, AdminGuard],
  exports: [AuthService, UserGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
