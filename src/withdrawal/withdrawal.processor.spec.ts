import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { WithdrawalProcessor, WithdrawalJobPayload } from './withdrawal.processor';
import { WithdrawalService } from './withdrawal.service';
import { TronTransferService } from '../blockchain/tron-transfer.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { WithdrawalStatus } from '../crypto-donation/entities/withdrawal-status.enum';

const VALID_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

describe('WithdrawalProcessor', () => {
  let processor: WithdrawalProcessor;
  let withdrawalService: jest.Mocked<WithdrawalService>;
  let tronTransferService: jest.Mocked<TronTransferService>;
  let blockchainService: jest.Mocked<BlockchainService>;

  const mockWithdrawal = {
    id: 'wd-123',
    userId: 'user-1',
    amount: '10.000000',
    walletAddress: VALID_TRON,
    status: WithdrawalStatus.PROCESSING,
    txHash: null as string | null,
    failureReason: null,
    processedAt: null,
    createdAt: new Date(),
  };

  function createJob(payload: WithdrawalJobPayload): Job<WithdrawalJobPayload, unknown, string> {
    return {
      data: payload,
      id: 'job-1',
      name: 'process',
    } as Job<WithdrawalJobPayload, unknown, string>;
  }

  beforeEach(async () => {
    const mockWithdrawalService = {
      findById: jest.fn(),
      saveTxHash: jest.fn(),
      markCompleted: jest.fn(),
      refundAndMarkFailed: jest.fn(),
      markFailedNoRefund: jest.fn(),
    };

    const mockTronTransfer = {
      sendUsdt: jest.fn(),
    };

    const mockBlockchain = {
      getTransactionInfo: jest.fn(),
      getLatestBlockNumber: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalProcessor,
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: TronTransferService, useValue: mockTronTransfer },
        { provide: BlockchainService, useValue: mockBlockchain },
      ],
    }).compile();

    processor = module.get<WithdrawalProcessor>(WithdrawalProcessor);
    withdrawalService = module.get(WithdrawalService);
    tronTransferService = module.get(TronTransferService);
    blockchainService = module.get(BlockchainService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('skips when withdrawal not found', async () => {
      (withdrawalService.findById as jest.Mock).mockResolvedValue(null);
      const job = createJob({ withdrawalId: 'nonexistent' });

      await (processor as any).process(job);

      expect(withdrawalService.refundAndMarkFailed).not.toHaveBeenCalled();
      expect(withdrawalService.markCompleted).not.toHaveBeenCalled();
      expect(tronTransferService.sendUsdt).not.toHaveBeenCalled();
    });

    it('skips when status is not PROCESSING (idempotent)', async () => {
      (withdrawalService.findById as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.COMPLETED,
      });
      const job = createJob({ withdrawalId: 'wd-123' });

      await (processor as any).process(job);

      expect(tronTransferService.sendUsdt).not.toHaveBeenCalled();
      expect(withdrawalService.markCompleted).not.toHaveBeenCalled();
    });

    it('sends USDT when no txHash, then waits confirmations and marks completed', async () => {
      (withdrawalService.findById as jest.Mock).mockResolvedValue(mockWithdrawal);
      (tronTransferService.sendUsdt as jest.Mock).mockResolvedValue('tx-hash-abc');
      (blockchainService.getTransactionInfo as jest.Mock).mockResolvedValue({
        id: 'tx-hash-abc',
        blockNumber: 100,
        blockTimestamp: Date.now(),
      });
      (blockchainService.getLatestBlockNumber as jest.Mock).mockResolvedValue(112); // 12 confirmations

      const job = createJob({ withdrawalId: 'wd-123' });
      await (processor as any).process(job);

      expect(tronTransferService.sendUsdt).toHaveBeenCalledWith(
        VALID_TRON,
        '10.000000',
      );
      expect(withdrawalService.saveTxHash).toHaveBeenCalledWith('wd-123', 'tx-hash-abc');
      expect(withdrawalService.markCompleted).toHaveBeenCalledWith(
        'wd-123',
        'tx-hash-abc',
      );
    });

    it('refunds and marks failed when sendUsdt throws', async () => {
      (withdrawalService.findById as jest.Mock).mockResolvedValue(mockWithdrawal);
      (tronTransferService.sendUsdt as jest.Mock).mockRejectedValue(
        new Error('Insufficient balance'),
      );

      const job = createJob({ withdrawalId: 'wd-123' });

      await expect((processor as any).process(job)).rejects.toThrow(
        'Insufficient balance',
      );
      expect(withdrawalService.refundAndMarkFailed).toHaveBeenCalledWith(
        'wd-123',
        'Insufficient balance',
      );
      expect(withdrawalService.markCompleted).not.toHaveBeenCalled();
    });

    it('skips send when txHash already set (idempotent retry)', async () => {
      (withdrawalService.findById as jest.Mock).mockResolvedValue({
        ...mockWithdrawal,
        txHash: 'existing-tx-hash',
      });
      (blockchainService.getTransactionInfo as jest.Mock).mockResolvedValue({
        id: 'existing-tx-hash',
        blockNumber: 100,
        blockTimestamp: Date.now(),
      });
      (blockchainService.getLatestBlockNumber as jest.Mock).mockResolvedValue(111);

      const job = createJob({ withdrawalId: 'wd-123' });
      await (processor as any).process(job);

      expect(tronTransferService.sendUsdt).not.toHaveBeenCalled();
      expect(withdrawalService.saveTxHash).not.toHaveBeenCalled();
      expect(withdrawalService.markCompleted).toHaveBeenCalledWith(
        'wd-123',
        'existing-tx-hash',
      );
    });
  });
});
