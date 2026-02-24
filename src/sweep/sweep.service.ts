import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TronWeb } from 'tronweb';
import { CryptoPayment } from '../crypto-donation/entities/crypto-payment.entity';
import { CryptoPaymentStatus } from '../crypto-donation/entities/crypto-payment-status.enum';
import { WalletService } from '../wallet/wallet.service';

const USDT_TRC20 = 'TVDykcqEFnmxDanPDx2Lee9FL6c8nFqEqG';
/** TRX amount to send for energy (enough for one USDT transfer) */
const TRX_FOR_ENERGY = 5;

/**
 * Service for sweeping USDT from payment wallets to the master wallet.
 * After confirmation: send TRX for energy, then transfer USDT to master.
 */
@Injectable()
export class SweepService {
  private readonly logger = new Logger(SweepService.name);
  private readonly masterAddress: string;
  private readonly masterPrivateKey: string;
  private readonly fullHost: string;
  private masterTronWeb: TronWeb | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(CryptoPayment)
    private readonly paymentRepo: Repository<CryptoPayment>,
  ) {
    this.masterAddress = this.configService.get<string>('TRON_MASTER_ADDRESS') ?? '';
    this.masterPrivateKey = this.configService.get<string>('TRON_MASTER_PRIVATE_KEY') ?? '';
    this.fullHost = this.configService.get<string>(
      'TRON_FULL_HOST',
      'https://nile.trongrid.io',
    );
  }

  private getMasterTronWeb(): TronWeb {
    if (!this.masterTronWeb) {
      this.masterTronWeb = new TronWeb({
        fullHost: this.fullHost,
        privateKey: this.masterPrivateKey,
      });
    }
    return this.masterTronWeb;
  }

  /**
   * Returns true if master wallet is configured (sweep is enabled).
   */
  isConfigured(): boolean {
    return !!(
      this.masterAddress &&
      this.masterPrivateKey &&
      this.masterAddress.length > 0 &&
      this.masterPrivateKey.length > 0
    );
  }

  /**
   * Get confirmed payments that haven't been swept yet.
   */
  async getUnsweptPayments(): Promise<CryptoPayment[]> {
    if (!this.isConfigured()) return [];
    return this.paymentRepo.find({
      where: {
        status: CryptoPaymentStatus.CONFIRMED,
        sweptAt: null as any,
      },
    });
  }

  /**
   * Sweep USDT from a payment wallet to master.
   * - Checks USDT balance first (read-only); if 0, marks swept without sending TRX.
   * - Sends TRX for energy only once per payment (tracked by energySentAt); on retry after USDT failure we only retry the USDT transfer.
   */
  async sweepPayment(payment: CryptoPayment): Promise<void> {
    const privateKey = this.walletService.decryptPrivateKey(
      payment.privateKeyEncrypted,
    );
    this.logger.debug(`Private key: ${privateKey}`);
    // 0. Check USDT balance before spending any TRX (read-only call, no cost)
    const usdtBalance = await this.getUsdtBalance(payment.address);
    if (usdtBalance === 0n) {
      this.logger.warn(`No USDT at ${payment.address}, marking as swept without sending TRX`);
      payment.sweptAt = new Date();
      await this.paymentRepo.save(payment);
      return;
    }

    try {
      // 1. Send TRX for energy only if we haven't already (avoids draining master when USDT transfer fails and we retry)
      if (!payment.energySentAt) {
        await this.sendTrxForEnergy(payment.address, TRX_FOR_ENERGY);
        this.logger.debug(`Sent TRX for energy to ${payment.address}`);
        payment.energySentAt = new Date();
        await this.paymentRepo.save(payment);
      } else {
        this.logger.debug(`TRX already sent for ${payment.address}, retrying USDT transfer only`);
      }

      // 2. Transfer USDT to master
      await this.transferUsdtToMaster(payment.address, privateKey);
      this.logger.debug(`Transfered USDT to master from ${payment.address} to ${this.masterAddress}`);
    } catch (err) {
      const errMsg = this.normalizeErrorMessage(err);
      this.logger.error(
        `Sweep failed for payment ${payment.id}: ${errMsg}`,
      );
      if (err instanceof Error && err.stack) {
        this.logger.debug(err.stack);
      }
      if (err != null && typeof err === 'object' && /Unknown error|\{\}/.test(errMsg)) {
        const names = Object.getOwnPropertyNames(err);
        const extra = names
          .filter((k) => !['stack', 'message'].includes(k))
          .map((k) => `${k}=${JSON.stringify((err as unknown as Record<string, unknown>)[k])}`)
          .join(', ');
        if (extra) this.logger.debug(`Error properties: ${extra}`);
      }
      throw err;
    }

    payment.sweptAt = new Date();
    await this.paymentRepo.save(payment);
    this.logger.log(`Swept payment ${payment.id} to master wallet`);
  }

  /** Get USDT (TRC20) balance for an address (read-only, no TRX cost). */
  private async getUsdtBalance(address: string): Promise<bigint> {
    const tronWeb = this.getMasterTronWeb();
    const contract = await tronWeb.contract().at(USDT_TRC20);
    const balance = await contract.balanceOf(address).call();
    const balanceStr = balance?.toString() ?? '0';
    return BigInt(balanceStr);
  }

  /**
   * Build a readable error string from unknown thrown values (e.g. TronWeb errors that serialize as "Unknown error: {}").
   */
  private normalizeErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      const parts = [err.message];
      const anyErr = err as unknown as Record<string, unknown>;
      if (anyErr.response != null) {
        parts.push(`response: ${JSON.stringify(anyErr.response)}`);
      }
      if (anyErr.code != null) parts.push(`code: ${anyErr.code}`);
      if (anyErr.transaction != null) parts.push(`transaction: ${JSON.stringify(anyErr.transaction)}`);
      if (anyErr.error != null) parts.push(`error: ${JSON.stringify(anyErr.error)}`);
      if (anyErr.body != null) parts.push(`body: ${JSON.stringify(anyErr.body)}`);
      if (/^Unknown error/.test(err.message)) {
        try {
          const rest: Record<string, unknown> = {};
          for (const k of Object.getOwnPropertyNames(anyErr)) {
            if (!['message', 'stack', 'name'].includes(k)) {
              rest[k] = (anyErr as Record<string, unknown>)[k];
            }
          }
          if (Object.keys(rest).length > 0) {
            parts.push(`details: ${JSON.stringify(rest)}`);
          }
        } catch {
          // ignore
        }
      }
      return parts.join(' | ');
    }
    return String(err);
  }

  /**
   * Send TRX from master wallet to address (for energy/bandwidth).
   * Fails fast with a clear error if master balance is insufficient.
   */
  private async sendTrxForEnergy(toAddress: string, amountTrx: number): Promise<string> {
    const tronWeb = this.getMasterTronWeb();
    const amountSun = amountTrx * 1_000_000; // TRX has 6 decimals

    // Reserve some TRX for bandwidth (same tx consumes some); avoid "balance is not sufficient"
    const reserveSun = 2 * 1_000_000; // 2 TRX reserve
    const balanceSun = await tronWeb.trx.getBalance(this.masterAddress);
    const balanceTrx = (balanceSun as number) / 1_000_000;
    if (balanceSun < amountSun + reserveSun) {
      throw new Error(
        `Master wallet has insufficient TRX. Need at least ${amountTrx + 2} TRX (${amountTrx} for energy + 2 reserve). Current balance: ${balanceTrx.toFixed(2)} TRX. Top up TRON_MASTER_ADDRESS.`,
      );
    }

    try {
      const tx = await tronWeb.trx.sendTransaction(toAddress, amountSun);
      if (tx.result === false || tx.result === undefined) {
        throw new Error(`TRX send failed: ${JSON.stringify(tx)}`);
      }
      return tx.txid || tx.transaction?.txID;
    } catch (err) {
      const msg = this.normalizeErrorMessage(err);
      throw new Error(`TRX send failed: ${msg}`, { cause: err instanceof Error ? err : undefined });
    }
  }

  /**
   * Transfer USDT from payment wallet to master using contract transfer.
   */
  private async transferUsdtToMaster(
    fromAddress: string,
    fromPrivateKey: string,
  ): Promise<string> {
    const tronWeb = new TronWeb({
      fullHost: this.fullHost,
      privateKey: fromPrivateKey,
    });
    this.logger.debug(`Transfering USDT to master from ${fromAddress} to ${this.masterAddress}`);
    const contract = await tronWeb.contract().at(USDT_TRC20);
    const balance = await contract.balanceOf(fromAddress).call();
    const balanceStr = balance.toString();
    if (balanceStr === '0' || BigInt(balanceStr) <= 0n) {
      this.logger.warn(`No USDT balance at ${fromAddress}, skip transfer`);
      return '';
    }

    try {
      const txId = await contract
        .transfer(this.masterAddress, balanceStr)
        .send({ feeLimit: 100_000_000 });
      return txId;
    } catch (err) {
      const msg = this.normalizeErrorMessage(err);
      throw new Error(`USDT transfer failed: ${msg}`, { cause: err instanceof Error ? err : undefined });
    }
  }
}
