import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'TRON_FULL_HOST') return 'https://nile.trongrid.io';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('rawToUsdt', () => {
    it('should convert raw 6 decimals to USDT string', () => {
      expect(BlockchainService.rawToUsdt('1000000')).toBe('1.000000');
      expect(BlockchainService.rawToUsdt('1500000')).toBe('1.500000');
      expect(BlockchainService.rawToUsdt('0')).toBe('0.000000');
    });
  });

  describe('usdtToRaw', () => {
    it('should convert USDT amount to raw', () => {
      expect(BlockchainService.usdtToRaw(1)).toBe('1000000');
      expect(BlockchainService.usdtToRaw(10.5)).toBe('10500000');
      expect(BlockchainService.usdtToRaw('1.5')).toBe('1500000');
    });
  });
});
