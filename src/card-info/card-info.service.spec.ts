import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardInfoService } from './card-info.service';
import { CardInfo } from './card-info.entity';
import { CreateCardInfoDto } from './dto/create-card-info.dto';

describe('CardInfoService', () => {
  let service: CardInfoService;
  let repo: jest.Mocked<Repository<CardInfo>>;

  const mockCardInfo: CardInfo = {
    id: 'uuid-card-1',
    cardNumber: '1234567890123456',
    holderName: 'John Doe',
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
      createQueryBuilder: jest.fn().mockReturnValue({
        getMany: jest.fn().mockResolvedValue([]),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      }),
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

  describe('createCardInfo', () => {
    const dto: CreateCardInfoDto = {
      cardNumber: '1234567890123456',
      holderName: 'John Doe',
    };

    it('creates and saves card info with dto fields', async () => {
      (repo.create as jest.Mock).mockReturnValue({ ...dto });
      (repo.save as jest.Mock).mockResolvedValue(mockCardInfo);

      const result = await service.createCardInfo(dto);

      expect(repo.create).toHaveBeenCalledWith({
        cardNumber: dto.cardNumber,
        holderName: dto.holderName,
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cardNumber: dto.cardNumber,
          holderName: dto.holderName,
        }),
      );
      expect(result).toEqual(mockCardInfo);
    });
  });

  describe('findAll', () => {
    it('returns all card info from repository', async () => {
      const list = [mockCardInfo];
      (repo.createQueryBuilder as jest.Mock).mockReturnValue({
        getMany: jest.fn().mockResolvedValue(list),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      });

      const result = await service.findAll();

      expect(result).toEqual(list);
    });
  });
});
