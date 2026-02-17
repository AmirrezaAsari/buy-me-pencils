import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Payment } from './payment.entity';
import { createPaymentDto } from './dto/create-payment.dto';
import { PaymentStatusEnum } from './enum/payment-status.enum';
import { ZarinPalService } from './zarinpal.service';

@Injectable()
export class PaymentService extends BaseRepository<Payment> {
    constructor(
      @InjectRepository(Payment)
      private readonly paymentRepository: Repository<Payment>,
    ) {
      super(paymentRepository);
    }

    async findByRefId(refId: string) {
      return this.paymentRepository.findOne({
        where: {
          refId: refId,
          deletedAt: undefined,
        }
      });
    }

    async create(inputs: createPaymentDto) {
      const paymentData = await this.paymentRepository.create({
        amount: inputs.amount,
        status: PaymentStatusEnum.PENDING,
        userName: inputs.userName || null,
        message: inputs.message || null,
      });
      return await this.paymentRepository.save(paymentData);
    }

}
