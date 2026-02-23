import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/** USDT TRC20 contract address on mainnet */
// testnet Nile: TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs
// mainnet: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
const USDT_TRC20_CONTRACT = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs';

export interface Trc20Transfer {
  transaction_id: string;
  token_info: { symbol: string; address: string };
  from_address: string;
  to_address: string;
  value: string; // Raw value (6 decimals for USDT)
  block_timestamp: number;
  block: number;
}

export interface Trc20TransactionsResponse {
  success: boolean;
  data?: Trc20Transfer[];
  error?: string;
}

export interface TransactionInfo {
  id: string;
  blockNumber: number;
  blockTimestamp: number;
}

/**
 * Service for interacting with TronGrid API.
 * Used to fetch TRC20 transactions and block info.
 */
@Injectable()
export class BlockchainService {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(BlockchainService.name);

  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('TRON_FULL_HOST', 'https://nile.trongrid.io') +
      '/v1';
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.TRONGRID_API_KEY && {
          'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY,
        }),
      },
    });
  }

  /**
   * Fetch TRC20 transactions for an address.
   * TronGrid: GET /v1/accounts/{address}/transactions/trc20
   */
  async getTrc20Transactions(
    address: string,
    options?: {
      limit?: number;
      min_timestamp?: number;
      contract_address?: string;
    },
  ): Promise<Trc20Transfer[]> {
    const params: Record<string, string | number | boolean> = {
      limit: options?.limit ?? 50,
    };
    if (options?.min_timestamp) params.min_timestamp = options.min_timestamp;
    if (options?.contract_address)
      params.contract_address = options.contract_address;

    const url = `/accounts/${address}/transactions/trc20`;
    this.logger.debug(`Fetching TRC20 transactions for ${address}: ${JSON.stringify(params)}`);
    const { data } = await this.http.get<Trc20TransactionsResponse>(url, {
      params,
    });
    this.logger.debug(`TRC20 transactions: ${JSON.stringify(data)}`);

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to fetch TRC20 transactions');
    }

    return data.data;
  }

  /**
   * Fetch incoming USDT transfers to an address.
   */
  async getIncomingUsdtTransfers(
    toAddress: string,
    minTimestamp?: number,
  ): Promise<Trc20Transfer[]> {
    const all = await this.getTrc20Transactions(toAddress);

    return all.filter((t) => t.to_address === toAddress);
  }

  /**
   * Get transaction info (block number, etc.) for confirmation count.
   */
  async getTransactionInfo(txId: string): Promise<TransactionInfo | null> {
    try {
      const { data } = await this.http.get<{
        id: string;
        blockNumber: number;
        blockTimestamp: number;
      }>(`/transactions/${txId}`);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Get current block number (for confirmation calculation).
   * Uses legacy wallet API (getnowblock) for reliable response.
   */
  async getLatestBlockNumber(): Promise<number> {
    const base = this.baseUrl.replace('/v1', '');
    const url = `${base}/wallet/getnowblock`;
    const { data } = await this.http.get<{
      block_header?: { raw_data?: { number?: number } };
      number?: number;
    }>(url);
    this.logger.debug(`Latest block number: ${data?.block_header?.raw_data?.number ?? (data as any)?.number ?? 0}`);
    return (
      data?.block_header?.raw_data?.number ??
      (data as any)?.number ??
      0
    );
  }

  /**
   * Convert USDT raw value (6 decimals) to human-readable.
   */
  static rawToUsdt(raw: string): string {
    const num = BigInt(raw);
    return (Number(num) / 1_000_000).toFixed(6);
  }

  /**
   * Convert USDT amount to raw (6 decimals).
   */
  static usdtToRaw(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return Math.floor(num * 1_000_000).toString();
  }
}
