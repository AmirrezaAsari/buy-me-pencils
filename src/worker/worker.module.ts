import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentMonitorWorker } from './payment-monitor.worker';
import { SweepWorker } from './sweep.worker';
import { CryptoDonationModule } from '../crypto-donation/crypto-donation.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { SweepModule } from '../sweep/sweep.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CryptoDonationModule,
    BlockchainModule,
    SweepModule,
  ],
  providers: [PaymentMonitorWorker, SweepWorker],
})
export class WorkerModule {}
