import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TronWeb from 'tronweb';
import { BlockchainService } from './blockchain.service';

/** Default USDT TRC20 contract on mainnet */
const DEFAULT_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

/**
 * Sends USDT (TRC20) from the master wallet to a given address.
 * Private key is read from ENV and never logged.
 */
@Injectable()
export class TronTransferService {
  private readonly logger = new Logger(TronTransferService.name);
  private readonly fullHost: string;
  private readonly usdtContract: string;
  private masterTronWeb: TronWeb | null = null;

  constructor(private readonly configService: ConfigService) {
    this.fullHost =
      this.configService.get<string>('TRON_FULL_HOST', 'https://api.trongrid.io') ?? '';
    this.usdtContract =
      this.configService.get<string>('TRON_USDT_CONTRACT', DEFAULT_USDT_CONTRACT) ?? DEFAULT_USDT_CONTRACT;
  }

  /**
   * Returns true if master wallet is configured for withdrawals.
   */
  isConfigured(): boolean {
    const address = this.configService.get<string>('TRON_MASTER_ADDRESS');
    const key = this.configService.get<string>('TRON_MASTER_PRIVATE_KEY');
    return !!(address && key && address.length > 0 && key.length > 0);
  }

  /**
   * Lazy-init TronWeb with master private key. Key is never logged.
   */
  private getMasterTronWeb(): TronWeb {
    if (!this.masterTronWeb) {
      const privateKey = this.configService.get<string>('TRON_MASTER_PRIVATE_KEY');
      if (!privateKey) {
        throw new Error('TRON_MASTER_PRIVATE_KEY is not configured');
      }
      this.masterTronWeb = new TronWeb({
        fullHost: this.fullHost,
        privateKey,
      });
    }
    return this.masterTronWeb;
  }

  /**
   * Send USDT from master wallet to recipient.
   * @param walletAddress - TRON address (base58) to receive USDT
   * @param amount - Amount in USDT (human-readable, e.g. 10.5)
   * @returns Transaction ID (txHash)
   */
  async sendUsdt(walletAddress: string, amount: number | string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Master wallet is not configured for withdrawals');
    }

    const amountRaw = BlockchainService.usdtToRaw(amount);
    const tronWeb = this.getMasterTronWeb();
    const contract = await tronWeb.contract().at(this.usdtContract);

    // transfer(to, amount) - amount in raw (6 decimals)
    const txId = await contract
      .transfer(walletAddress, amountRaw)
      .send({ feeLimit: 100_000_000 });

    this.logger.log(
      `USDT transfer sent to ${walletAddress}, amount=${amount}, txId=${txId}`,
    );
    return txId;
  }
}
