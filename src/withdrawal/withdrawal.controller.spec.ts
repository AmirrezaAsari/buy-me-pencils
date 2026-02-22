import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { UserGuard } from '../auth/guards/user.guard';
import { User } from '../users/user.entity';
import { WithdrawalStatus } from '../crypto-donation/entities/withdrawal-status.enum';

const VALID_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

describe('WithdrawalController', () => {
  let controller: WithdrawalController;
  let withdrawalService: jest.Mocked<WithdrawalService>;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test',
    email: 'test@test.com',
    type: 'user',
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockWithdrawal = {
    id: 'wd-123',
    amount: '10.000000',
    walletAddress: VALID_TRON,
    status: WithdrawalStatus.PENDING,
    txHash: null,
    failureReason: null,
    createdAt: new Date(),
    processedAt: null,
  };

  beforeEach(async () => {
    const mockWithdrawalService = {
      requestWithdrawal: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawalController],
      providers: [
        { provide: WithdrawalService, useValue: mockWithdrawalService },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WithdrawalController>(WithdrawalController);
    withdrawalService = module.get(WithdrawalService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestWithdrawal', () => {
    it('calls service and returns withdrawal response', async () => {
      (withdrawalService.requestWithdrawal as jest.Mock).mockResolvedValue(mockWithdrawal);

      const result = await controller.requestWithdrawal(mockUser, {
        amount: 10,
        walletAddress: VALID_TRON,
      });

      expect(withdrawalService.requestWithdrawal).toHaveBeenCalledWith(
        'user-123',
        { amount: 10, walletAddress: VALID_TRON },
      );
      expect(result).toMatchObject({
        id: 'wd-123',
        amount: 10,
        walletAddress: VALID_TRON,
        status: WithdrawalStatus.PENDING,
      });
      expect(result.createdAt).toBeDefined();
    });
  });

  describe('getMyWithdrawals', () => {
    it('returns list of withdrawals for current user', async () => {
      (withdrawalService.findByUserId as jest.Mock).mockResolvedValue([
        mockWithdrawal,
      ]);

      const result = await controller.getMyWithdrawals(mockUser);

      expect(withdrawalService.findByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'wd-123',
        amount: 10,
        status: WithdrawalStatus.PENDING,
      });
    });
  });
});
