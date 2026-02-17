import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { Payment } from './payment.entity';
import { TransactionService } from './transaction.service';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Payment]),
  ],
  providers: [TransactionService, PaymentService],
  exports: [TransactionService, PaymentService],
})
export class PaymentsModule {}
