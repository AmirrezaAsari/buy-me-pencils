import { Test, TestingModule } from '@nestjs/testing';
import { CardInfoController } from './card-info.controller';
import { CardInfoService } from './card-info.service';
import { CardInfo } from './card-info.entity';
import { UserGuard } from '../auth/guards/user.guard';

describe('CardInfoController', () => {
  let controller: CardInfoController;
  let cardInfoService: jest.Mocked<CardInfoService>;

  const mockCardInfo: CardInfo = {
    id: 'uuid-card-1',
    cardNumber: '1234567890123456',
    holderName: 'John Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockCardInfoService = {
      createCardInfo: jest.fn().mockResolvedValue(mockCardInfo),
      findAll: jest.fn().mockResolvedValue([mockCardInfo]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardInfoController],
      providers: [{ provide: CardInfoService, useValue: mockCardInfoService }],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CardInfoController>(CardInfoController);
    cardInfoService = module.get(CardInfoService);
  });

  describe('create', () => {
    const dto = {
      cardNumber: '1234567890123456',
      holderName: 'John Doe',
    };

    it('calls cardInfoService.createCardInfo and returns created card info', async () => {
      const result = await controller.create(dto);

      expect(cardInfoService.createCardInfo).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCardInfo);
    });
  });

  describe('findAll', () => {
    it('calls cardInfoService.findAll and returns all card info', async () => {
      const result = await controller.findAll();

      expect(cardInfoService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockCardInfo]);
    });
  });
});
