import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CardInfoService } from './card-info.service';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UserGuard } from '../auth/guards/user.guard';

@UseGuards(UserGuard)
@Controller('card-info')
export class CardInfoController {
  constructor(private readonly cardInfoService: CardInfoService) {}

  @Post()
  async create(@Body() body: CreateCardInfoDto) {
    return this.cardInfoService.createCardInfo(body);
  }

  @Get()
  async findAll() {
    return this.cardInfoService.findAll();
  }
}
