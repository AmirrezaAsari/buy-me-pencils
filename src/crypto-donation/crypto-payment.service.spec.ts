import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CryptoPaymentService } from './crypto-payment.service';
import { CryptoPayment } from './entities/crypto-payment.entity';
import { CryptoTransaction } from './entities/crypto-transaction.entity';
import { User } from '../users/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { CryptoPaymentStatus } from './entities/crypto-payment-status.enum';

describe('CryptoPaymentService', () => {
  let service: CryptoPaymentService;
  let paymentRepo: jest.Mocked<Repository<CryptoPayment>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let walletService: jest.Mocked<WalletService>;

  const mockCreator: Partial<User> = {
    id: 'creator-uuid-123',
    email: 'creator@test.com',
    name: 'Creator',
    cryptoBalance: '0',
  };

  const mockPayment: Partial<CryptoPayment> = {
    id: 'payment-uuid-456',
    creatorId: 'creator-uuid-123',
    address: 'TAddress123',
    amountExpected: '1000000',
    status: CryptoPaymentStatus.PENDING,
    txHash: null,
    creator: mockCreator as User,
  };

  beforeEach(async () => {
    const mockPaymentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      })),
    };

    const mockTxRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    walletService = {
      generateWallet: jest.fn().mockResolvedValue({
        address: 'TNewAddress',
        privateKey: 'pk',
        privateKeyEncrypted: 'enc-pk',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoPaymentService,
        { provide: getRepositoryToken(CryptoPayment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(CryptoTransaction), useValue: mockTxRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: WalletService, useValue: walletService },
      ],
    }).compile();

    service = module.get<CryptoPaymentService>(CryptoPaymentService);
    paymentRepo = module.get(getRepositoryToken(CryptoPayment));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should throw NotFoundException when creator does not exist', async () => {
      (paymentRepo as any).save = jest.fn();
      const userRepoInst = (service as any).userRepo;
      userRepoInst.findOne.mockResolvedValue(null);

      await expect(
        service.createPayment({ creatorId: 'nonexistent', amountUSD: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create payment when creator exists', async () => {
      const userRepoInst = (service as any).userRepo;
      userRepoInst.findOne.mockResolvedValue(mockCreator);
      (paymentRepo as any).create.mockReturnValue(mockPayment);
      (paymentRepo as any).save.mockResolvedValue({
        ...mockPayment,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await service.createPayment({
        creatorId: 'creator-uuid-123',
        amountUSD: 10,
      });

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('address');
      expect(result.currency).toBe('USDT');
      expect(walletService.generateWallet).toHaveBeenCalled();
    });
  });

  describe('findPendingPayments', () => {
    it('should return pending payments', async () => {
      (paymentRepo as any).find.mockResolvedValue([mockPayment]);
      const pending = await service.findPendingPayments();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe(CryptoPaymentStatus.PENDING);
    });
  });
});
