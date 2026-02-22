import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TronTransferService } from './tron-transfer.service';

describe('TronTransferService', () => {
  let service: TronTransferService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const env: Record<string, string> = {
          TRON_FULL_HOST: 'https://api.trongrid.io',
          TRON_MASTER_ADDRESS: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          TRON_MASTER_PRIVATE_KEY: 'mock-private-key',
          TRON_USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        };
        return env[key] ?? defaultVal;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TronTransferService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TronTransferService>(TronTransferService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isConfigured', () => {
    it('returns true when master address and key are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when master address is missing', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'TRON_MASTER_ADDRESS') return '';
        if (key === 'TRON_MASTER_PRIVATE_KEY') return 'key';
        return null;
      });
      const svc = new TronTransferService(configService);
      expect(svc.isConfigured()).toBe(false);
    });

    it('returns false when master private key is missing', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'TRON_MASTER_ADDRESS') return 'Txxx';
        if (key === 'TRON_MASTER_PRIVATE_KEY') return '';
        return null;
      });
      const svc = new TronTransferService(configService);
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('sendUsdt', () => {
    it('throws when master wallet is not configured', async () => {
      (configService.get as jest.Mock).mockImplementation(() => '');
      const svc = new TronTransferService(configService);

      await expect(
        svc.sendUsdt('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 10),
      ).rejects.toThrow(/not configured/);
    });
  });
});
