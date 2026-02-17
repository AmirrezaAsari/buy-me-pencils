import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PaymentService } from './payment.service';
import axios from 'axios';

@Injectable()
export class ZarinPalService {
    constructor(
        private readonly paymentService: PaymentService,
    ){}

    private readonly zarinPalUrl = process.env.ZARINPAL_URL;
    private readonly merchantId = process.env.ZARINPAL_MERCHANT_ID;

    async checkoutPayment(
        paymentId: number, inputs: {
        amount: number,
        currency: string,
        description: string,
        callback_url: string,
    }) {
        const payment = await this.paymentService.findById(paymentId);
        if (!payment) {
            throw Error('Payment not found');
        }
        try {
            let result = {};
            const body = {
              merchant_id: this.merchantId,
              amount: inputs.amount,
              callback_url: inputs.callback_url,
              description: 'Transaction description.',
            };
            const response = await axios.post(`${this.zarinPalUrl}/pg/v4/payment/request.json`, body, {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            });

            if (response.data.data.code === 100) {
                result = await this.paymentService.save(Object.assign(payment, {checkoutUrl: `${process.env.ZARINPAL_URL}/pg/StartPay/${response.data.data['authority']}/`, refId: response.data.data['authority']}))
            }
            return result;

        } catch (error) {
            console.error(error.response?.data || error.message);
            throw new HttpException('Payment request failed', HttpStatus.BAD_GATEWAY);
        }
    } 


    async verify(refId: string) {
        const payment = await this.paymentService.findByRefId(refId);
        if (!payment) {
            throw new Error('payment not found');
        }

        const response = await axios.post(`${this.zarinPalUrl}/pg/v4/payment/verify.json`, {
            merchant_id: this.merchantId,
            amount: Number(payment.amount),
            authority: payment.refId,
        });
        if (response.data.data.code == 100) {
            return true
        } else {
            return false
        }

    }
}
