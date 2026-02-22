import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { WITHDRAWAL_QUEUE_NAME } from './withdrawal.processor';
import { WithdrawalStatus } from '../crypto-donation/entities/withdrawal-status.enum';
import { UserGuard } from '../auth/guards/user.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('AdminWithdrawalController', () => {
  let controller: AdminWithdrawalController;
  let withdrawalService: jest.Mocked<WithdrawalService>;
  let queue: jest.Mocked<Queue>;

  const mockWithdrawal = {
    id: 'wd-123',
    status: WithdrawalStatus.PROCESSING,
  };

  beforeEach(async () => {
    const mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const mockWithdrawalService = {
      approveWithdrawal: jest.fn(),
      rejectWithdrawal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminWithdrawalController],
      providers: [
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: getQueueToken(WITHDRAWAL_QUEUE_NAME), useValue: mockQueue },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminWithdrawalController>(AdminWithdrawalController);
    withdrawalService = module.get(WithdrawalService);
    queue = module.get(getQueueToken(WITHDRAWAL_QUEUE_NAME)) as jest.Mocked<Queue>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('approve', () => {
    it('calls service with enqueue callback and returns approval result', async () => {
      (withdrawalService.approveWithdrawal as jest.Mock).mockImplementation(
        async (id: string, enqueue: (id: string) => Promise<void>) => {
          await enqueue(id);
          return mockWithdrawal;
        },
      );

      const result = await controller.approve('wd-123');

      expect(withdrawalService.approveWithdrawal).toHaveBeenCalledWith(
        'wd-123',
        expect.any(Function),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'process',
        { withdrawalId: 'wd-123' },
        expect.objectContaining({ attempts: 3 }),
      );
      expect(result).toMatchObject({
        id: 'wd-123',
        status: WithdrawalStatus.PROCESSING,
        message: expect.stringContaining('approved'),
      });
    });
  });

  describe('reject', () => {
    it('calls rejectWithdrawal and returns result', async () => {
      (withdrawalService.rejectWithdrawal as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.REJECTED,
      });

      const result = await controller.reject('wd-123');

      expect(withdrawalService.rejectWithdrawal).toHaveBeenCalledWith('wd-123');
      expect(result).toMatchObject({
        id: 'wd-123',
        message: expect.stringContaining('rejected'),
      });
    });
  });
});
