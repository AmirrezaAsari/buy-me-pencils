import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentMonitorWorker } from './payment-monitor.worker';
import { SweepWorker } from './sweep.worker';
import { WithdrawalConfirmationWorker } from './withdrawal-confirmation.worker';
import { CryptoDonationModule } from '../crypto-donation/crypto-donation.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { SweepModule } from '../sweep/sweep.module';
import { WithdrawalModule } from '../withdrawal/withdrawal.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CryptoDonationModule,
    BlockchainModule,
    SweepModule,
    WithdrawalModule,
  ],
  providers: [PaymentMonitorWorker, SweepWorker, WithdrawalConfirmationWorker],
})
export class WorkerModule {}
