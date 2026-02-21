import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardInfo } from './card-info.entity';
import { CardInfoService } from './card-info.service';
import { CardInfoController } from './card-info.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CardInfo]), AuthModule],
  controllers: [CardInfoController],
  providers: [CardInfoService],
  exports: [CardInfoService],
})
export class CardInfoModule {}
