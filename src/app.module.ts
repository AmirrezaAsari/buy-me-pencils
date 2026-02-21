import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
<<<<<<< Updated upstream
=======
import { CardInfoModule } from './card-info/card-info.module';
import { CryptoModule } from './crypto/crypto.module';
import { CryptoDonationModule } from './crypto-donation/crypto-donation.module';
import { WalletModule } from './wallet/wallet.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { SweepModule } from './sweep/sweep.module';
import { WorkerModule } from './worker/worker.module';
>>>>>>> Stashed changes
import { UsersController } from './users/users.controller';
import { PaymentController } from './payments/payment.controller';
import { AuthController } from './auth/auth.controller';

@Module({
<<<<<<< Updated upstream
  imports: [DatabaseModule, AuthModule, UsersModule, PaymentsModule],
  controllers: [AppController, UsersController, PaymentController, AuthController],
=======
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    CardInfoModule,
  ],
  controllers: [
    AppController,
    UsersController,
    PaymentController,
    AuthController,
  ],
>>>>>>> Stashed changes
  providers: [AppService],
})
export class AppModule {}
