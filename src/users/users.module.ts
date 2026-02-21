import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PublicUserController } from './public-user.controller';
import { PublicUserService } from './public-user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [UsersController, PublicUserController],
  providers: [UsersService, PublicUserService],
  exports: [UsersService],
})
export class UsersModule {}

