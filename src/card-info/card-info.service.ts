import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { CardInfo } from './card-info.entity';
import { CreateCardInfoDto } from './dto/create-card-info.dto';

@Injectable()
export class CardInfoService extends BaseRepository<CardInfo> {
  constructor(
    @InjectRepository(CardInfo)
    private readonly cardInfoRepository: Repository<CardInfo>,
  ) {
    super(cardInfoRepository);
  }

  async createCardInfo(dto: CreateCardInfoDto): Promise<CardInfo> {
    const cardInfo = this.cardInfoRepository.create({
      cardNumber: dto.cardNumber,
      holderName: dto.holderName,
    });
    return this.cardInfoRepository.save(cardInfo);
  }
}
