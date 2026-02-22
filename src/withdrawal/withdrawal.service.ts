import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Withdrawal } from '../crypto-donation/entities/withdrawal.entity';
import { WithdrawalStatus } from '../crypto-donation/entities/withdrawal-status.enum';
import {
  UserBalanceRecord,
  BalanceChangeType,
} from '../crypto-donation/entities/user-balance-record.entity';
import { User } from '../users/user.entity';
import { isValidTronAddress } from '../common/utils/tron-address.util';
import {
  isBalanceSufficient,
  subtractDecimal,
  addDecimal,
} from '../common/utils/decimal.util';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

/** Minimum withdrawal amount in USDT */
const MIN_WITHDRAWAL_AMOUNT = 1;

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserBalanceRecord)
    private readonly balanceRecordRepo: Repository<UserBalanceRecord>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Request a withdrawal: validate, create pending record, deduct balance in one transaction.
   */
  async requestWithdrawal(userId: string, dto: CreateWithdrawalDto): Promise<Withdrawal> {
    const amountStr = dto.amount.toFixed(6);
    const minAmount = this.configService.get<number>(
      'MIN_WITHDRAWAL_AMOUNT',
      MIN_WITHDRAWAL_AMOUNT,
    );

    if (dto.amount < minAmount) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${minAmount} USDT`,
      );
    }

    if (!isValidTronAddress(dto.walletAddress)) {
      throw new BadRequestException('Invalid TRON wallet address');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const balance = user.cryptoBalance ?? '0.000000';
    if (!isBalanceSufficient(balance, amountStr)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Transaction: create withdrawal + deduct balance + balance record (prevent double withdrawal)
    const withdrawal = await this.dataSource.transaction(async (manager) => {
      // Re-read user with lock to prevent concurrent withdrawal race
      const lockedUser = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedUser) throw new NotFoundException('User not found');

      const currentBalance = lockedUser.cryptoBalance ?? '0.000000';
      if (!isBalanceSufficient(currentBalance, amountStr)) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = subtractDecimal(currentBalance, amountStr);

      const withdrawalEntity = manager.create(Withdrawal, {
        userId,
        amount: amountStr,
        walletAddress: dto.walletAddress.trim(),
        status: WithdrawalStatus.PENDING,
      });
      const savedWithdrawal = await manager.save(Withdrawal, withdrawalEntity);

      await manager.update(User, { id: userId }, { cryptoBalance: newBalance });

      await manager.save(UserBalanceRecord, {
        userId,
        amount: `-${amountStr}`,
        balanceAfter: newBalance,
        type: BalanceChangeType.DEBIT,
        referenceType: 'withdrawal',
        referenceId: savedWithdrawal.id,
      });

      return savedWithdrawal;
    });

    this.logger.log(
      `Withdrawal ${withdrawal.id} requested by user ${userId}, amount=${amountStr} USDT`,
    );
    return withdrawal;
  }

  /**
   * Admin approves a pending withdrawal: set status to processing and enqueue job.
   * Caller must enqueue the job after this (processor checks status === PROCESSING).
   */
  async approveWithdrawal(
    withdrawalId: string,
    enqueueJob: (withdrawalId: string) => Promise<void>,
  ): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Withdrawal is not pending (current: ${withdrawal.status})`,
      );
    }

    withdrawal.status = WithdrawalStatus.PROCESSING;
    await this.withdrawalRepo.save(withdrawal);

    await enqueueJob(withdrawalId);

    this.logger.log(`Withdrawal ${withdrawalId} approved and queued for processing`);
    return withdrawal;
  }

  /**
   * Admin rejects a pending withdrawal: return balance to user, set status rejected.
   */
  async rejectWithdrawal(withdrawalId: string): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Withdrawal is not pending (current: ${withdrawal.status})`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: withdrawal.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return;

      const currentBalance = user.cryptoBalance ?? '0.000000';
      const newBalance = addDecimal(currentBalance, withdrawal.amount);

      await manager.update(User, { id: withdrawal.userId }, { cryptoBalance: newBalance });

      await manager.save(UserBalanceRecord, {
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        balanceAfter: newBalance,
        type: BalanceChangeType.CREDIT,
        referenceType: 'withdrawal_rejected',
        referenceId: withdrawal.id,
      });

      withdrawal.status = WithdrawalStatus.REJECTED;
      withdrawal.failureReason = 'Rejected by admin';
      await manager.save(Withdrawal, withdrawal);
    });

    // Re-fetch to return updated entity
    const updated = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });
    this.logger.log(`Withdrawal ${withdrawalId} rejected, balance returned`);
    return updated!;
  }

  /**
   * Return balance to user and mark withdrawal as failed (used by worker on transfer failure).
   */
  async refundAndMarkFailed(
    withdrawalId: string,
    failureReason: string,
  ): Promise<void> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      this.logger.warn(`Withdrawal ${withdrawalId} not found for refund`);
      return;
    }
    if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
      this.logger.warn(
        `Withdrawal ${withdrawalId} status is ${withdrawal.status}, skip refund`,
      );
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: withdrawal.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return;

      const currentBalance = user.cryptoBalance ?? '0.000000';
      const newBalance = addDecimal(currentBalance, withdrawal.amount);

      await manager.update(User, { id: withdrawal.userId }, { cryptoBalance: newBalance });

      await manager.save(UserBalanceRecord, {
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        balanceAfter: newBalance,
        type: BalanceChangeType.CREDIT,
        referenceType: 'withdrawal_failed',
        referenceId: withdrawal.id,
      });

      withdrawal.status = WithdrawalStatus.FAILED;
      withdrawal.failureReason = failureReason.slice(0, 512);
      withdrawal.processedAt = new Date();
      await manager.save(Withdrawal, withdrawal);
    });

    this.logger.log(
      `Withdrawal ${withdrawalId} failed: ${failureReason}, balance returned`,
    );
  }

  /**
   * Mark withdrawal completed (worker calls after confirmations).
   */
  /**
   * Persist txHash after sending (for idempotent retries: next run skips send).
   */
  async saveTxHash(withdrawalId: string, txHash: string): Promise<void> {
    await this.withdrawalRepo.update(
      { id: withdrawalId, status: WithdrawalStatus.PROCESSING },
      { txHash },
    );
  }

  async markCompleted(withdrawalId: string, txHash: string): Promise<void> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) return;
    if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
      this.logger.warn(
        `Withdrawal ${withdrawalId} status is ${withdrawal.status}, skip mark completed`,
      );
      return;
    }

    withdrawal.status = WithdrawalStatus.COMPLETED;
    withdrawal.txHash = txHash;
    withdrawal.processedAt = new Date();
    await this.withdrawalRepo.save(withdrawal);
    this.logger.log(`Withdrawal ${withdrawalId} completed, txHash=${txHash}`);
  }

  /**
   * Mark withdrawal failed without refund (e.g. confirmation timeout after tx was sent).
   * Use when txHash is already set - funds are on-chain, do not double-refund.
   */
  async markFailedNoRefund(withdrawalId: string, failureReason: string): Promise<void> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal || withdrawal.status !== WithdrawalStatus.PROCESSING) return;
    withdrawal.status = WithdrawalStatus.FAILED;
    withdrawal.failureReason = failureReason.slice(0, 512);
    withdrawal.processedAt = new Date();
    await this.withdrawalRepo.save(withdrawal);
    this.logger.warn(`Withdrawal ${withdrawalId} marked failed (no refund): ${failureReason}`);
  }

  async findById(id: string): Promise<Withdrawal | null> {
    return this.withdrawalRepo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Withdrawal[]> {
    return this.withdrawalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
