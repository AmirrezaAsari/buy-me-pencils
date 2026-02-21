import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardInfoService } from './card-info.service';
import { CardInfo } from './card-info.entity';
import { CreateCardInfoDto } from './dto/create-card-info.dto';

describe('CardInfoService', () => {
  let service: CardInfoService;
  let repo: jest.Mocked<Repository<CardInfo>>;

  const userId = 'user-1';
  const mockCardInfo: CardInfo = {
    id: 'uuid-card-1',
    cardNumber: '1234567890123456',
    holderName: 'John Doe',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: entity.id ?? 'uuid-card-1' }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardInfoService,
        {
          provide: getRepositoryToken(CardInfo),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CardInfoService>(CardInfoService);
    repo = module.get(getRepositoryToken(CardInfo));
  });

  describe('findForUser', () => {
    it('returns cards for user', async () => {
      (repo.find as jest.Mock).mockResolvedValue([mockCardInfo]);

      const result = await service.findForUser(userId);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockCardInfo]);
    });
  });

  describe('createCardInfo', () => {
    const dto: CreateCardInfoDto = {
      cardNumber: '1234567890123456',
      holderName: 'John Doe',
    };

    it('creates and saves card info with userId and dto fields', async () => {
      (repo.create as jest.Mock).mockReturnValue({ ...dto, userId });
      (repo.save as jest.Mock).mockResolvedValue(mockCardInfo);

      const result = await service.createCardInfo(userId, dto);

      expect(repo.create).toHaveBeenCalledWith({
        cardNumber: dto.cardNumber,
        holderName: dto.holderName,
        userId,
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cardNumber: dto.cardNumber,
          holderName: dto.holderName,
          userId,
        }),
      );
      expect(result).toEqual(mockCardInfo);
    });
  });

  describe('updateCardInfo', () => {
    it('updates card when user owns it', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockCardInfo);
      (repo.save as jest.Mock).mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateCardInfo(
        mockCardInfo.id,
        userId,
        { holderName: 'Jane Doe' },
      );

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: mockCardInfo.id } });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ holderName: 'Jane Doe' }),
      );
      expect(result).toBeDefined();
    });
  });
});
