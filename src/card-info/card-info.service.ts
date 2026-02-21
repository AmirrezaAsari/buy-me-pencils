import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { CardInfo } from './card-info.entity';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UpdateCardInfoDto } from './dto/update-card-info.dto';

@Injectable()
export class CardInfoService extends BaseRepository<CardInfo> {
  constructor(
    @InjectRepository(CardInfo)
    private readonly cardInfoRepository: Repository<CardInfo>,
  ) {
    super(cardInfoRepository);
  }

  async findForUser(userId: string): Promise<CardInfo[]> {
    return this.cardInfoRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCardInfo(userId: string, dto: CreateCardInfoDto): Promise<CardInfo> {
    const cardInfo = this.cardInfoRepository.create({
      cardNumber: dto.cardNumber,
      holderName: dto.holderName,
      userId,
    });
    return this.cardInfoRepository.save(cardInfo);
  }

  async updateCardInfo(
    id: string,
    userId: string,
    dto: UpdateCardInfoDto,
  ): Promise<CardInfo> {
    const card = await this.cardInfoRepository.findOne({ where: { id } });
    if (!card) {
      throw new ForbiddenException('Card info not found');
    }
    if (card.userId !== userId) {
      throw new ForbiddenException('Not allowed to update this card');
    }
    if (dto.cardNumber !== undefined) card.cardNumber = dto.cardNumber;
    if (dto.holderName !== undefined) card.holderName = dto.holderName;
    return this.cardInfoRepository.save(card);
  }
}
