import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_SECRET')
        return 'a'.repeat(32);
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt roundtrip', () => {
    const plain = 'a1b2c3d4e5f6-private-key';
    const encrypted = service.encrypt(plain);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plain);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plain);
  });

  it('should produce different ciphertext for same plaintext (IV randomness)', () => {
    const plain = 'test';
    const e1 = service.encrypt(plain);
    const e2 = service.encrypt(plain);
    expect(e1).not.toBe(e2);
    expect(service.decrypt(e1)).toBe(plain);
    expect(service.decrypt(e2)).toBe(plain);
  });

  it('secureCompare should detect equal strings', () => {
    expect(CryptoService.secureCompare('abc', 'abc')).toBe(true);
    expect(CryptoService.secureCompare('a', 'a')).toBe(true);
  });

  it('secureCompare should detect unequal strings', () => {
    expect(CryptoService.secureCompare('abc', 'abd')).toBe(false);
    expect(CryptoService.secureCompare('abc', 'ab')).toBe(false);
    expect(CryptoService.secureCompare('', 'x')).toBe(false);
  });
});
