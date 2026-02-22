import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WithdrawalStatus } from '../crypto-donation/entities/withdrawal-status.enum';
import { WithdrawalService } from './withdrawal.service';
import { TronTransferService } from '../blockchain/tron-transfer.service';
import { BlockchainService } from '../blockchain/blockchain.service';

export const WITHDRAWAL_QUEUE_NAME = 'withdrawal';

/** Required confirmations before marking withdrawal completed */
const REQUIRED_CONFIRMATIONS = 10;
/** Poll interval for confirmation check (ms) */
const CONFIRMATION_POLL_MS = 5000;
/** Max wait for confirmations (ms) */
const CONFIRMATION_TIMEOUT_MS = 600_000; // 10 min

export interface WithdrawalJobPayload {
  withdrawalId: string;
}

/**
 * Background worker: process withdrawals with status PROCESSING.
 * 1. Send USDT from master to user wallet (or skip if txHash already set - idempotent)
 * 2. Wait for required confirmations
 * 3. Mark completed or on failure refund and mark failed.
 */
@Processor(WITHDRAWAL_QUEUE_NAME)
export class WithdrawalProcessor extends WorkerHost {
  private readonly logger = new Logger(WithdrawalProcessor.name);

  constructor(
    private readonly withdrawalService: WithdrawalService,
    private readonly tronTransferService: TronTransferService,
    private readonly blockchainService: BlockchainService,
  ) {
    super();
  }

  async process(job: Job<WithdrawalJobPayload, unknown, string>): Promise<void> {
    const { withdrawalId } = job.data;
    const withdrawal = await this.withdrawalService.findById(withdrawalId);

    if (!withdrawal) {
      this.logger.warn(`Withdrawal ${withdrawalId} not found, skipping job`);
      return;
    }

    // Idempotent: only process when status is PROCESSING
    if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
      this.logger.warn(
        `Withdrawal ${withdrawalId} status is ${withdrawal.status}, skipping`,
      );
      return;
    }

    let txHash = withdrawal.txHash ?? null;

    // Step 1: Send USDT if not already sent (retry-safe)
    if (!txHash) {
      try {
        txHash = await this.tronTransferService.sendUsdt(
          withdrawal.walletAddress,
          withdrawal.amount,
        );
      } catch (err) {
        const message = (err as Error).message;
        this.logger.error(`Withdrawal ${withdrawalId} transfer failed: ${message}`);
        await this.withdrawalService.refundAndMarkFailed(withdrawalId, message);
        throw err;
      }

      // Persist txHash immediately so retries don't double-send (idempotent)
      await this.withdrawalService.saveTxHash(withdrawalId, txHash);
    }

    // Step 2: Wait for confirmations
    const confirmed = await this.waitForConfirmations(txHash!);
    if (!confirmed) {
      const msg = 'Confirmation timeout';
      // Do not refund: tx was already sent, funds are on-chain
      await this.withdrawalService.markFailedNoRefund(withdrawalId, msg);
      throw new Error(msg);
    }

    // Step 3: Mark completed
    await this.withdrawalService.markCompleted(withdrawalId, txHash!);
  }

  /**
   * Poll until transaction has >= REQUIRED_CONFIRMATIONS.
   */
  private async waitForConfirmations(txHash: string): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < CONFIRMATION_TIMEOUT_MS) {
      const info = await this.blockchainService.getTransactionInfo(txHash);
      if (info) {
        const latestBlock = await this.blockchainService.getLatestBlockNumber();
        const confirmations = latestBlock - info.blockNumber;
        if (confirmations >= REQUIRED_CONFIRMATIONS) {
          return true;
        }
      }
      await new Promise((r) => setTimeout(r, CONFIRMATION_POLL_MS));
    }
    return false;
  }
}
