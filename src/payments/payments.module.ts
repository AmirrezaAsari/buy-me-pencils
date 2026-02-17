import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { Payment } from './payment.entity';
import { TransactionService } from './transaction.service';
import { PaymentService } from './payment.service';
import { ZarinPalService } from './zarinpal.service';
import { PaymentUtilService } from './payment.util.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Payment]),
  ],
  providers: [TransactionService, PaymentService, ZarinPalService, PaymentUtilService],
  exports: [TransactionService, PaymentService, ZarinPalService, PaymentUtilService],
})
export class PaymentsModule {}
