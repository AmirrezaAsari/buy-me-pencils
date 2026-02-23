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
const TRX_FOR_ENERGY = 15;

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
   * 1. Send TRX from master to payment address (for energy)
   * 2. Transfer USDT from payment wallet to master
   */
  async sweepPayment(payment: CryptoPayment): Promise<void> {
    const privateKey = this.walletService.decryptPrivateKey(
      payment.privateKeyEncrypted,
    );

    try {
      // 1. Send TRX for energy
      await this.sendTrxForEnergy(payment.address, TRX_FOR_ENERGY);
      this.logger.debug(`Sent TRX for energy to ${payment.address}`);

      // 2. Transfer USDT to master
      await this.transferUsdtToMaster(payment.address, privateKey);
      this.logger.debug(`Transfered USDT to master from ${payment.address} to ${this.masterAddress}`);
    } catch (err) {
      this.logger.error(
        `Sweep failed for payment ${payment.id}: ${(err as Error).message}`,
      );
      throw err;
    }

    payment.sweptAt = new Date();
    await this.paymentRepo.save(payment);
    this.logger.log(`Swept payment ${payment.id} to master wallet`);
  }

  /**
   * Send TRX from master wallet to address (for energy/bandwidth).
   */
  private async sendTrxForEnergy(toAddress: string, amountTrx: number): Promise<string> {
    const tronWeb = this.getMasterTronWeb();
    const amountSun = amountTrx * 1_000_000; // TRX has 6 decimals
    const tx = await tronWeb.trx.sendTransaction(toAddress, amountSun);
    if (tx.result === false || tx.result === undefined) {
      throw new Error(`TRX send failed: ${JSON.stringify(tx)}`);
    }
    return tx.txid || tx.transaction?.txID;
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
    this.logger.debug(`Transfer USDT to master from ${fromAddress} to ${this.masterAddress}`);
    const contract = await tronWeb.contract().at(USDT_TRC20);
    const balance = await contract.balanceOf(fromAddress).call();
    const balanceStr = balance.toString();
    if (balanceStr === '0' || BigInt(balanceStr) <= 0n) {
      this.logger.warn(`No USDT balance at ${fromAddress}, skip transfer`);
      return '';
    }

    const txId = await contract
      .transfer(this.masterAddress, balanceStr)
      .send({ feeLimit: 100_000_000 });
    return txId;
  }
}
