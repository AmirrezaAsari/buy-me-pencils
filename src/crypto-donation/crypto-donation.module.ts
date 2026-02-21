import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoPayment } from './entities/crypto-payment.entity';
import { CryptoTransaction } from './entities/crypto-transaction.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { CryptoPaymentService } from './crypto-payment.service';
import { CryptoDonationController } from './crypto-donation.controller';
import { WalletModule } from '../wallet/wallet.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoPayment, CryptoTransaction, Withdrawal, User]),
    WalletModule,
  ],
  controllers: [CryptoDonationController],
  providers: [CryptoPaymentService],
  exports: [CryptoPaymentService],
})
export class CryptoDonationModule {}
