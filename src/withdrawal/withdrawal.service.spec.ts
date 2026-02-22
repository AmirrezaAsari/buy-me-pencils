import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { Withdrawal } from '../crypto-donation/entities/withdrawal.entity';
import { WithdrawalStatus } from '../crypto-donation/entities/withdrawal-status.enum';
import { UserBalanceRecord } from '../crypto-donation/entities/user-balance-record.entity';
import { User } from '../users/user.entity';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

jest.mock('../common/utils/tron-address.util', () => ({
  isValidTronAddress: jest.fn((addr: string) => {
    if (!addr || addr.length !== 34) return false;
    if (addr === 'invalid') return false;
    return true;
  }),
}));

// Valid TRON base58 address (USDT contract - valid address format)
const VALID_TRON_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let withdrawalRepo: jest.Mocked<Repository<Withdrawal>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'u@test.com',
    cryptoBalance: '100.000000',
  };

  const mockWithdrawal: Partial<Withdrawal> = {
    id: 'wd-123',
    userId: 'user-123',
    amount: '10.000000',
    walletAddress: VALID_TRON_ADDRESS,
    status: WithdrawalStatus.PENDING,
    txHash: null,
    failureReason: null,
    processedAt: null,
    createdAt: new Date(),
  };

  const mockManager = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockWithdrawalRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockBalanceRecordRepo = {
      save: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultVal?: number) => {
        if (key === 'MIN_WITHDRAWAL_AMOUNT') return 1;
        return defaultVal;
      }),
    };

    dataSource = {
      transaction: jest.fn((fn: (manager: any) => Promise<any>) => fn(mockManager)),
    } as any;

    mockManager.findOne.mockImplementation((entity: any, opts?: any) => {
      if (entity === User) {
        return Promise.resolve({ ...mockUser, cryptoBalance: '100.000000' });
      }
      return Promise.resolve(null);
    });
    mockManager.update.mockResolvedValue({ affected: 1 });
    mockManager.save.mockImplementation((entity: any, data?: any) => {
      if (entity === Withdrawal) {
        return Promise.resolve({ ...mockWithdrawal, ...data });
      }
      return Promise.resolve(data || {});
    });
    mockManager.create = jest.fn((entity: any, data: any) => ({ ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        { provide: getRepositoryToken(Withdrawal), useValue: mockWithdrawalRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserBalanceRecord), useValue: mockBalanceRecordRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    withdrawalRepo = module.get(getRepositoryToken(Withdrawal));
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestWithdrawal', () => {
    const dto: CreateWithdrawalDto = {
      amount: 10,
      walletAddress: VALID_TRON_ADDRESS,
    };

    it('throws BadRequestException when amount below minimum', async () => {
      await expect(
        service.requestWithdrawal('user-123', { ...dto, amount: 0.5 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestWithdrawal('user-123', { ...dto, amount: 0.5 }),
      ).rejects.toThrow(/Minimum withdrawal/);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when wallet address is invalid', async () => {
      await expect(
        service.requestWithdrawal('user-123', { ...dto, walletAddress: 'invalid' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestWithdrawal('user-123', { ...dto, walletAddress: 'invalid' }),
      ).rejects.toThrow(/Invalid TRON/);
    });

    it('throws NotFoundException when user does not exist', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.requestWithdrawal('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.requestWithdrawal('nonexistent', dto)).rejects.toThrow(
        'User not found',
      );
    });

    it('throws BadRequestException when balance insufficient', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockUser,
        cryptoBalance: '5.000000',
      });
      await expect(service.requestWithdrawal('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.requestWithdrawal('user-123', dto)).rejects.toThrow(
        'Insufficient balance',
      );
    });

    it('creates withdrawal and deducts balance in transaction', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      const result = await service.requestWithdrawal('user-123', dto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockManager.findOne).toHaveBeenCalledWith(User, expect.objectContaining({
        where: { id: 'user-123' },
        lock: { mode: 'pessimistic_write' },
      }));
      expect(mockManager.update).toHaveBeenCalledWith(
        User,
        { id: 'user-123' },
        { cryptoBalance: '90.000000' },
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        UserBalanceRecord,
        expect.objectContaining({
          userId: 'user-123',
          amount: '-10.000000',
          balanceAfter: '90.000000',
          referenceType: 'withdrawal',
        }),
      );
      expect(result.status).toBe(WithdrawalStatus.PENDING);
      expect(result.amount).toBe('10.000000');
      expect(result.walletAddress).toBe(VALID_TRON_ADDRESS);
    });
  });

  describe('approveWithdrawal', () => {
    it('throws NotFoundException when withdrawal not found', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue(null);
      const enqueue = jest.fn();

      await expect(
        service.approveWithdrawal('nonexistent', enqueue),
      ).rejects.toThrow(NotFoundException);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when status is not pending', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.PROCESSING,
      });
      const enqueue = jest.fn();

      await expect(
        service.approveWithdrawal('wd-123', enqueue),
      ).rejects.toThrow(BadRequestException);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('sets status to PROCESSING and calls enqueueJob', async () => {
      (withdrawalRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockWithdrawal })
        .mockResolvedValueOnce({ ...mockWithdrawal, status: WithdrawalStatus.PROCESSING });
      (withdrawalRepo.save as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.PROCESSING,
      });
      const enqueue = jest.fn().mockResolvedValue(undefined);

      const result = await service.approveWithdrawal('wd-123', enqueue);

      expect(result.status).toBe(WithdrawalStatus.PROCESSING);
      expect(enqueue).toHaveBeenCalledWith('wd-123');
    });
  });

  describe('rejectWithdrawal', () => {
    it('throws NotFoundException when withdrawal not found', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.rejectWithdrawal('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when status is not pending', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.COMPLETED,
      });

      await expect(service.rejectWithdrawal('wd-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns balance and sets status to REJECTED in transaction', async () => {
      (withdrawalRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ ...mockWithdrawal })
        .mockResolvedValueOnce({
          ...mockWithdrawal,
          status: WithdrawalStatus.REJECTED,
          failureReason: 'Rejected by admin',
        });
      mockManager.findOne.mockResolvedValue({ ...mockUser, cryptoBalance: '90.000000' });

      const result = await service.rejectWithdrawal('wd-123');

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(
        User,
        { id: 'user-123' },
        { cryptoBalance: '100.000000' },
      );
      expect(result).toBeDefined();
    });
  });

  describe('refundAndMarkFailed', () => {
    it('does nothing when withdrawal not found', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.refundAndMarkFailed('wd-123', 'error'),
      ).resolves.not.toThrow();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('does nothing when status is not PROCESSING', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.COMPLETED,
      });
      await service.refundAndMarkFailed('wd-123', 'error');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('markCompleted', () => {
    it('updates withdrawal to COMPLETED with txHash and processedAt', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.PROCESSING,
      });
      (withdrawalRepo.save as jest.Mock).mockResolvedValue({});

      await service.markCompleted('wd-123', 'tx-hash-abc');

      expect(withdrawalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wd-123',
          status: WithdrawalStatus.COMPLETED,
          txHash: 'tx-hash-abc',
          processedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('saveTxHash', () => {
    it('updates withdrawal txHash', async () => {
      (withdrawalRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });

      await service.saveTxHash('wd-123', 'tx-xyz');

      expect(withdrawalRepo.update).toHaveBeenCalledWith(
        { id: 'wd-123', status: WithdrawalStatus.PROCESSING },
        { txHash: 'tx-xyz' },
      );
    });
  });

  describe('markFailedNoRefund', () => {
    it('updates status to FAILED and sets failureReason', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.PROCESSING,
      });
      (withdrawalRepo.save as jest.Mock).mockResolvedValue({});

      await service.markFailedNoRefund('wd-123', 'Confirmation timeout');

      expect(withdrawalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WithdrawalStatus.FAILED,
          failureReason: 'Confirmation timeout',
          processedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('findById and findByUserId', () => {
    it('findById returns withdrawal with user relation', async () => {
      (withdrawalRepo.findOne as jest.Mock).mockResolvedValue(mockWithdrawal);

      const result = await service.findById('wd-123');

      expect(withdrawalRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'wd-123' },
        relations: ['user'],
      });
      expect(result).toEqual(mockWithdrawal);
    });

    it('findByUserId returns list ordered by createdAt DESC', async () => {
      (withdrawalRepo.find as jest.Mock).mockResolvedValue([mockWithdrawal]);

      const result = await service.findByUserId('user-123');

      expect(withdrawalRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });
});
