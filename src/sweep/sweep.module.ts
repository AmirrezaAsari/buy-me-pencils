import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SweepService } from './sweep.service';
import { CryptoPayment } from '../crypto-donation/entities/crypto-payment.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoPayment]),
    WalletModule,
  ],
  providers: [SweepService],
  exports: [SweepService],
})
export class SweepModule {}
