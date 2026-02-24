import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WithdrawalService } from '../withdrawal/withdrawal.service';
import { BlockchainService } from '../blockchain/blockchain.service';

/** Required confirmations before marking withdrawal completed (match withdrawal.processor) */
const REQUIRED_CONFIRMATIONS = 10;

/**
 * Cron worker: polls PROCESSING withdrawals that have a txHash, checks confirmation on chain (TronGrid/Nile), and marks them completed when confirmed.
 * Handles cases where the BullMQ job timed out or failed to update status.
 */
@Injectable()
export class WithdrawalConfirmationWorker {
  private readonly logger = new Logger(WithdrawalConfirmationWorker.name);

  constructor(
    private readonly withdrawalService: WithdrawalService,
    private readonly blockchainService: BlockchainService,
  ) {}

  @Cron('0 * * * * *') // Every 1 minute (at second 0)
  async handleConfirmationCheck() {
    const list = await this.withdrawalService.findProcessingWithTxHash();
    if (list.length === 0) return;

    this.logger.log(`Checking confirmation for ${list.length} processing withdrawal(s) with txHash`);

    for (const withdrawal of list) {
      const txHash = withdrawal.txHash!;
      try {
        const info = await this.blockchainService.getTransactionInfo(txHash);
        if (!info) {
          this.logger.debug(`No tx info yet for withdrawal ${withdrawal.id}, txHash=${txHash}`);
          continue;
        }
        const latestBlock = await this.blockchainService.getLatestBlockNumber();
        const confirmations = latestBlock - info.blockNumber;
        if (confirmations >= REQUIRED_CONFIRMATIONS) {
          await this.withdrawalService.markCompleted(withdrawal.id, txHash);
          this.logger.log(`Withdrawal ${withdrawal.id} marked completed (${confirmations} confirmations)`);
        } else {
          this.logger.debug(`Withdrawal ${withdrawal.id}: ${confirmations}/${REQUIRED_CONFIRMATIONS} confirmations`);
        }
      } catch (err) {
        this.logger.warn(
          `Confirmation check failed for withdrawal ${withdrawal.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
