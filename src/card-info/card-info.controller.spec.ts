import { Test, TestingModule } from '@nestjs/testing';
import { CardInfoController } from './card-info.controller';
import { CardInfoService } from './card-info.service';
import { CardInfo } from './card-info.entity';
import { User } from '../users/user.entity';
import { UserGuard } from '../auth/guards/user.guard';

describe('CardInfoController', () => {
  let controller: CardInfoController;
  let cardInfoService: jest.Mocked<CardInfoService>;

  const mockUser: User = {
    id: 'user-1',
    name: 'Test',
    email: 'test@test.com',
    type: 'user',
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCardInfo: CardInfo = {
    id: 'uuid-card-1',
    cardNumber: '1234567890123456',
    holderName: 'John Doe',
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockCardInfoService = {
      findForUser: jest.fn().mockResolvedValue([mockCardInfo]),
      createCardInfo: jest.fn().mockResolvedValue(mockCardInfo),
      updateCardInfo: jest.fn().mockResolvedValue(mockCardInfo),
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

  describe('findForUser', () => {
    it('calls cardInfoService.findForUser with user id and returns list', async () => {
      const result = await controller.findForUser(mockUser);

      expect(cardInfoService.findForUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual([mockCardInfo]);
    });
  });

  describe('create', () => {
    const dto = {
      cardNumber: '1234567890123456',
      holderName: 'John Doe',
    };

    it('calls cardInfoService.createCardInfo with user id and dto', async () => {
      const result = await controller.create(mockUser, dto);

      expect(cardInfoService.createCardInfo).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(mockCardInfo);
    });
  });

  describe('update', () => {
    it('calls cardInfoService.updateCardInfo with user id, card id and body', async () => {
      const body = { holderName: 'Jane Doe' };
      const result = await controller.update(mockUser, 'uuid-card-1', body);

      expect(cardInfoService.updateCardInfo).toHaveBeenCalledWith(
        'uuid-card-1',
        mockUser.id,
        body,
      );
      expect(result).toEqual(mockCardInfo);
    });
  });
});
