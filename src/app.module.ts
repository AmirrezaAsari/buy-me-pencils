import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { CardInfoModule } from './card-info/card-info.module';
import { CryptoModule } from './crypto/crypto.module';
import { CryptoDonationModule } from './crypto-donation/crypto-donation.module';
import { WalletModule } from './wallet/wallet.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { SweepModule } from './sweep/sweep.module';
import { WorkerModule } from './worker/worker.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';
import { UsersController } from './users/users.controller';
import { PaymentController } from './payments/payment.controller';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    CryptoModule,
    AuthModule,
    UsersModule,
    PaymentsModule,
    CryptoDonationModule,
    WalletModule,
    BlockchainModule,
    SweepModule,
    WorkerModule,
    WithdrawalModule,
    CardInfoModule,
  ],
  controllers: [
    AppController,
    UsersController,
    PaymentController,
    AuthController,
  ],
  providers: [AppService],
})
export class AppModule {}
