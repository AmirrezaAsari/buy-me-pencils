import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CryptoPaymentService } from '../crypto-donation/crypto-payment.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CryptoPayment } from '../crypto-donation/entities/crypto-payment.entity';
import { CryptoPaymentStatus } from '../crypto-donation/entities/crypto-payment-status.enum';

/** Minimum confirmations required before marking payment confirmed */
const MIN_CONFIRMATIONS = 10;

/**
 * Background worker that monitors the blockchain for incoming USDT transfers.
 * Runs every 30 seconds. Idempotent - safe to run multiple times.
 */
@Injectable()
export class PaymentMonitorWorker {
  private readonly logger = new Logger(PaymentMonitorWorker.name);

  constructor(
    private readonly cryptoPaymentService: CryptoPaymentService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Cron: every 30 seconds.
   */
  @Cron('*/30 * * * * *')
  async handlePaymentMonitoring() {
    try {
      await this.expireStalePayments();
      await this.processPendingPayments();
    } catch (err) {
      this.logger.error('Payment monitoring error', err);
    }
  }

  /**
   * Mark expired pending payments.
   */
  private async expireStalePayments(): Promise<void> {
    const count = await this.cryptoPaymentService.expireStalePayments();
    if (count > 0) {
      this.logger.log(`Expired ${count} stale payment(s)`);
    }
  }

  /**
   * Fetch pending payments, check blockchain for incoming USDT, confirm when ready.
   */
  private async processPendingPayments(): Promise<void> {
    const pending = await this.cryptoPaymentService.findPendingPayments();
    if (pending.length === 0) return;

    const latestBlock = await this.blockchainService.getLatestBlockNumber();

    for (const payment of pending) {
      try {
        await this.processOnePayment(payment, latestBlock);
      } catch (err) {
        this.logger.warn(
          `Error processing payment ${payment.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async processOnePayment(
    payment: CryptoPayment,
    latestBlock: number,
  ): Promise<void> {
    // Fetch incoming USDT transfers to this address
    const minTimestamp =
      (payment.createdAt.getTime() / 1000) | 0;
    const transfers = await this.blockchainService.getIncomingUsdtTransfers(
      payment.address,
      minTimestamp,
    );

    if (transfers.length === 0) return;

    // Find transfer that matches: toAddress, amount >= expected
    const expectedRaw = BigInt(payment.amountExpected);
    for (const tx of transfers) {
      if (tx.to_address !== payment.address) continue;
      const amountRaw = BigInt(tx.value);
      if (amountRaw < expectedRaw) continue;

      const confirmations = latestBlock - tx.block + 1;
      if (confirmations < MIN_CONFIRMATIONS) {
        this.logger.debug(
          `Payment ${payment.id} tx ${tx.transaction_id} has ${confirmations} confirmations, need ${MIN_CONFIRMATIONS}`,
        );
        continue;
      }

      // Confirm payment (idempotent - checks txHash uniqueness)
      await this.cryptoPaymentService.confirmPayment(
        payment.id,
        tx.transaction_id,
        confirmations,
        tx.from_address,
        tx.value,
      );
      return; // One matching tx per payment
    }
  }
}
