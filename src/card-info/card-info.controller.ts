import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CardInfoService } from './card-info.service';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UpdateCardInfoDto } from './dto/update-card-info.dto';
import { UserGuard } from '../auth/guards/user.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@UseGuards(UserGuard)
@Controller('card-info')
export class CardInfoController {
  constructor(private readonly cardInfoService: CardInfoService) {}

  @Get()
  async findForUser(@CurrentUser() user: User) {
    return this.cardInfoService.findForUser(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() body: CreateCardInfoDto,
  ) {
    return this.cardInfoService.createCardInfo(user.id, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateCardInfoDto,
  ) {
    return this.cardInfoService.updateCardInfo(id, user.id, body);
  }
}
