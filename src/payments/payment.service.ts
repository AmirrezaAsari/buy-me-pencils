import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Payment } from './payment.entity';
import { createPaymentDto } from './dto/create-payment.dto';
import { PaymentStatusEnum } from './enum/payment-status.enum';
import { ZarinPalService } from './zarinpal.service';
import { HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';

@Injectable()
export class PaymentService extends BaseRepository<Payment> {
    constructor(
      @InjectRepository(Payment)
      private readonly paymentRepository: Repository<Payment>,
      private readonly zarinPalService: ZarinPalService,
    ) {
      super(paymentRepository);
    }

    async checkout(inputs: createPaymentDto) {
      const payment = await this.paymentRepository.create({
        amount: inputs.amount,
        status: PaymentStatusEnum.PENDING,
        userName: inputs.userName || null,
        message: inputs.message || null,
      });
      if (!payment) {
        throw new Error('Payment Failed');
      }
      const checkout = await this.zarinPalService.checkoutPayment(
        payment.id,{
        amount: payment.amount,
        currency: 'IRR',
        description: '',
        callback_url: `${process.env.BASE_URL}/payments/verify`,
      }); 
      return checkout;
    }

    async findByRefId(refId: string) {
      return this.paymentRepository.findOne({
        where: {
          refId: refId,
          deletedAt: undefined,
        }
      });
    }

    async verify(refId: string, status: string) {
      const payment = await this.findByRefId(refId);
      if (!payment) {
        throw Error('Payment not found.');
      }
      let result = {};
        
      if (status == '100') {

        try {
          const verify = await this.zarinPalService.verify(refId);
          if (verify === true) {
            result = await this.paymentRepository.save(Object.assign(
              payment,
              {
                status: PaymentStatusEnum.SUCCESS,
                doneAt: new Date(),
              }
            ));
          } else {
            result = await this.paymentRepository.save(Object.assign(
              payment,
              {
                status: PaymentStatusEnum.FAILED,
              }
            ));
          }

        } catch(e) {
          console.log(e);
          throw new HttpException(e, HttpStatus.BAD_GATEWAY);
        }
      } else {
        result = await this.paymentRepository.save(Object.assign(
          payment,
          {
            status: PaymentStatusEnum.FAILED,
          }
        ));
      }
      
      return result;
    }
}
