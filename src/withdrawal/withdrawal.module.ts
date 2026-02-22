import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Withdrawal } from '../crypto-donation/entities/withdrawal.entity';
import { UserBalanceRecord } from '../crypto-donation/entities/user-balance-record.entity';
import { User } from '../users/user.entity';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { WithdrawalProcessor, WITHDRAWAL_QUEUE_NAME } from './withdrawal.processor';
import { AuthModule } from '../auth/auth.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Withdrawal, User, UserBalanceRecord]),
    AuthModule,
    BlockchainModule,
    BullModule.registerQueue({ name: WITHDRAWAL_QUEUE_NAME }),
  ],
  controllers: [WithdrawalController, AdminWithdrawalController],
  providers: [WithdrawalService, WithdrawalProcessor],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
