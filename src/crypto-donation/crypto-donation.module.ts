import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoPayment } from './entities/crypto-payment.entity';
import { CryptoTransaction } from './entities/crypto-transaction.entity';
import { UserBalanceRecord } from './entities/user-balance-record.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { CryptoPaymentService } from './crypto-payment.service';
import { CryptoDonationController } from './crypto-donation.controller';
import { WalletModule } from '../wallet/wallet.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CryptoPayment,
      CryptoTransaction,
      UserBalanceRecord,
      Withdrawal,
      User,
    ]),
    WalletModule,
    BlockchainModule,
    AuthModule,
  ],
  controllers: [CryptoDonationController],
  providers: [CryptoPaymentService],
  exports: [CryptoPaymentService],
})
export class CryptoDonationModule {}
