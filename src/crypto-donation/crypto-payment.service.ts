import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoPayment } from './entities/crypto-payment.entity';
import { CryptoTransaction } from './entities/crypto-transaction.entity';
import { CryptoPaymentStatus } from './entities/crypto-payment-status.enum';
import { User } from '../users/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateCryptoPaymentDto } from './dto/create-crypto-payment.dto';

/** Payment validity window in minutes */
const PAYMENT_EXPIRY_MINUTES = 60;

/**
 * Service for creating and managing crypto payment invoices.
 */
@Injectable()
export class CryptoPaymentService {
  private readonly logger = new Logger(CryptoPaymentService.name);

  constructor(
    @InjectRepository(CryptoPayment)
    private readonly paymentRepo: Repository<CryptoPayment>,
    @InjectRepository(CryptoTransaction)
    private readonly txRepo: Repository<CryptoTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create a new crypto payment invoice for a creator.
   * Generates unique wallet, encrypts private key, persists payment.
   */
  async createPayment(dto: CreateCryptoPaymentDto) {
    // 1. Validate creator exists
    const creator = await this.userRepo.findOne({
      where: { id: dto.creatorId },
    });
    if (!creator) {
      throw new NotFoundException(`Creator with id ${dto.creatorId} not found`);
    }

    // 2. Convert USD → USDT (1:1 for now)
    const amountUsdt = dto.amountUSD;
    const amountCrypto = BlockchainService.usdtToRaw(amountUsdt);

    // 3. Generate TRON wallet using TronWeb
    const wallet = await this.walletService.generateWallet();

    // 4. Encrypt private key (done in WalletService)
    // 5. Create payment record
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PAYMENT_EXPIRY_MINUTES);

    const payment = this.paymentRepo.create({
      creatorId: dto.creatorId,
      address: wallet.address,
      privateKeyEncrypted: wallet.privateKeyEncrypted,
      amountExpected: amountCrypto,
      currency: 'USDT',
      status: CryptoPaymentStatus.PENDING,
      expiresAt,
    });

    const saved = await this.paymentRepo.save(payment);
    this.logger.log(
      `Created crypto payment ${saved.id} for creator ${dto.creatorId}, address=${wallet.address}`,
    );

    return {
      paymentId: saved.id,
      address: saved.address,
      amountCrypto: amountCrypto,
      currency: 'USDT',
      expiresAt: saved.expiresAt.toISOString(),
    };
  }

  /**
   * Get all pending payments (for worker).
   */
  async findPendingPayments(): Promise<CryptoPayment[]> {
    return this.paymentRepo.find({
      where: { status: CryptoPaymentStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Mark payment as confirmed (idempotent - checks txHash uniqueness).
   */
  async confirmPayment(
    paymentId: string,
    txHash: string,
    confirmations: number,
    fromAddress: string,
    amount: string,
  ): Promise<void> {
    // Validate txHash uniqueness (prevent double processing)
    const existingTx = await this.txRepo.findOne({ where: { txHash } });
    if (existingTx) {
      this.logger.warn(`Transaction ${txHash} already processed, skipping`);
      return;
    }

    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['creator'],
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    if (payment.status === CryptoPaymentStatus.CONFIRMED) {
      this.logger.warn(`Payment ${paymentId} already confirmed, skipping`);
      return;
    }

    // Update payment
    payment.status = CryptoPaymentStatus.CONFIRMED;
    payment.txHash = txHash;
    payment.confirmations = confirmations;
    await this.paymentRepo.save(payment);

    // Create transaction record
    await this.txRepo.save({
      paymentId: payment.id,
      txHash,
      fromAddress,
      toAddress: payment.address,
      amount,
      confirmations,
    });

    // Increase creator balance
    const creator = payment.creator as User;
    if (creator) {
      const currentBalance = parseFloat(creator.cryptoBalance || '0');
      const added = parseFloat(BlockchainService.rawToUsdt(amount));
      const newBalance = (currentBalance + added).toFixed(6);
      await this.userRepo.update(
        { id: payment.creatorId },
        { cryptoBalance: newBalance },
      );
    }

    this.logger.log(
      `Confirmed payment ${paymentId}, txHash=${txHash}, added ${BlockchainService.rawToUsdt(amount)} USDT to creator ${payment.creatorId}`,
    );
  }

  /**
   * Mark expired payments (worker calls this).
   */
  async expireStalePayments(): Promise<number> {
    const qr = await this.paymentRepo
      .createQueryBuilder()
      .update(CryptoPayment)
      .set({ status: CryptoPaymentStatus.EXPIRED })
      .where('status = :status', { status: CryptoPaymentStatus.PENDING })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();
    return qr.affected ?? 0;
  }

  /**
   * Get payment by ID.
   */
  async findById(id: string): Promise<CryptoPayment | null> {
    return this.paymentRepo.findOne({ where: { id } });
  }
}
