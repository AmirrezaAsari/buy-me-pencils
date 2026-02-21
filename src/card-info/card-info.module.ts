import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardInfo } from './card-info.entity';
import { CardInfoService } from './card-info.service';
import { CardInfoController } from './card-info.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CardInfo])],
  controllers: [CardInfoController],
  providers: [CardInfoService],
  exports: [CardInfoService],
})
export class CardInfoModule {}
