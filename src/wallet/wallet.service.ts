import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TronWeb } from 'tronweb';
import { CryptoService } from '../crypto/crypto.service';

/** USDT TRC20 contract address on mainnet */
const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  privateKeyEncrypted: string;
}

/**
 * Service for generating TRON wallets and encrypting private keys.
 */
@Injectable()
export class WalletService {
  private readonly tronWeb: TronWeb;
  private readonly fullHost: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {
    this.fullHost = this.configService.get<string>(
      'TRON_FULL_HOST',
      'https://api.trongrid.io',
    );
    // TronWeb without private key - we only use it for createAccount
    this.tronWeb = new TronWeb({
      fullHost: this.fullHost,
    });
  }

  /**
   * Generate a new TRON wallet (address + private key).
   * Private key is encrypted before storage.
   */
  async generateWallet(): Promise<GeneratedWallet> {
    const account = await this.tronWeb.createAccount();
    const privateKey = account.privateKey;
    const address = account.address.base58;

    const privateKeyEncrypted = this.cryptoService.encrypt(privateKey);

    return {
      address,
      privateKey,
      privateKeyEncrypted,
    };
  }

  /**
   * Decrypt and return the private key for a payment wallet (e.g. for sweep).
   */
  decryptPrivateKey(encryptedKey: string): string {
    return this.cryptoService.decrypt(encryptedKey);
  }

  /** USDT TRC20 contract address */
  getUsdtContractAddress(): string {
    return USDT_TRC20_CONTRACT;
  }

  /** TronGrid API base URL */
  getFullHost(): string {
    return this.fullHost;
  }
}
