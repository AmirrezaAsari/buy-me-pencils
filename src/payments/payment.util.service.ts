import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { ZarinPalService } from "./zarinpal.service";
import { createPaymentDto } from "./dto/create-payment.dto";
import { PaymentStatusEnum } from "./enum/payment-status.enum";

@Injectable()
export class PaymentUtilService {
    constructor(
        private readonly paymantService: PaymentService,
        private readonly zarinPalService: ZarinPalService,
    ) {}


    async checkout(inputs: createPaymentDto) {
        const payment = await this.paymantService.create(inputs);
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

      async verify(refId: string, status: string) {
        const payment = await this.paymantService.findByRefId(refId);
        if (!payment) {
          throw Error('Payment not found.');
        }
        let result = {};
          
        if (status == '100') {
  
          try {
            const verify = await this.zarinPalService.verify(refId);
            if (verify === true) {
              result = await this.paymantService.save(Object.assign(
                payment,
                {
                  status: PaymentStatusEnum.SUCCESS,
                  doneAt: new Date(),
                }
              ));
            } else {
              result = await this.paymantService.save(Object.assign(
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
          result = await this.paymantService.save(Object.assign(
            payment,
            {
              status: PaymentStatusEnum.FAILED,
            }
          ));
        }
        
        return result;
      }
}