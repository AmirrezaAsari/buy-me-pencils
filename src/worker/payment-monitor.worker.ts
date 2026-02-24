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
    this.logger.debug(`Latest block: ${latestBlock}`);
    this.logger.debug(`Pending payments: ${pending.length}`);
    for (const payment of pending) {
      this.logger.debug(`Processing payment ${payment.id}, latest block: ${latestBlock}`);
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
    this.logger.debug(`Transfers: ${transfers.map((t) => t.transaction_id).join(', ')}`);

    if (transfers.length === 0) return;
    this.logger.debug(`Found ${transfers.length} transfers for payment ${payment.id}: ${transfers.map((t) => t.transaction_id).join(', ')}`);

    // Find transfer that matches: toAddress, amount >= expected
    // tx.value can be string with decimals (e.g. "50000000.000000") from TronGrid; BigInt requires integer
    // convert decimal string to raw BigInt
    const decimals = 6n; // USDT TRC20 has 6 decimals
    const expectedRaw = BigInt(payment.amountExpected.split(".")[0]);
    for (const tx of transfers) {
      this.logger.debug(`Processing transfer ${tx.transaction_id} from ${tx.from} to ${tx.to} with amount ${tx.value}`);
      if (tx.to !== payment.address) {
        this.logger.debug(`Transfer ${tx.transaction_id} to ${tx.to} is not for payment ${payment.id}`);
      }
      const amountRaw = BigInt(Math.floor(Number(tx.value)));
      if (amountRaw < expectedRaw) {
        this.logger.debug(`Transfer ${tx.transaction_id} amount ${amountRaw} is less than expected ${expectedRaw}`);
        continue;
      }

      // const confirmations = latestBlock - tx.block + 1;
      const confirmations = 20; 
      /**
       * TODO: remove this and add real block confirmations check using the tongird apis 
       * for now, we are using a fixed value of 1 confirmation
       * we should get the blockNumber by transaction_id using the tongird apis
       * */

      if (confirmations < MIN_CONFIRMATIONS) {
        this.logger.debug(
          `Payment ${payment.id} tx ${tx.transaction_id} has ${confirmations} confirmations, need ${MIN_CONFIRMATIONS}`,
        );
        continue;
      }

      // Confirm payment (idempotent - checks txHash uniqueness)
      // Use integer string so DB and rawToUsdt get a valid raw value
      const amountStr = String(Math.floor(Number(tx.value)));
      await this.cryptoPaymentService.confirmPayment(
        payment.id,
        tx.transaction_id,
        confirmations,
        tx.from,
        amountStr,
      );
      this.logger.debug(`Confirmed payment ${payment.id} with tx ${tx.transaction_id} with amount ${amountStr}`);
      return; // One matching tx per payment
    }
  }
}
