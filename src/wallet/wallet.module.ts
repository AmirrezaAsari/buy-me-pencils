import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [ConfigModule, CryptoModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
