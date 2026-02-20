import { Body, Controller, Get, Injectable, Post, Query, Res } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { ApiTags } from "@nestjs/swagger";
import { createPaymentDto } from "./dto/create-payment.dto";
import { PaymentUtilService } from "./payment.util.service";
import { PaymentStatusEnum } from "./enum/payment-status.enum";

@Controller('payments')
@ApiTags('payments')
export class PaymentController {
    constructor(
        private readonly paymentUtilService: PaymentUtilService,
    ){}

    @Post()
    async create(
        @Body() inputs: createPaymentDto,
    ): Promise<object> {
        const payment = await this.paymentUtilService.checkout(inputs);
        return {
            message: 'payment successull.',
            data: {
                checkoutUrl: 'https://daramet.com/ItsRootKid'
            },
        }
    }

    @Get('/verify')
    async verify(
        @Query('Authority') authority: string,
        @Query('Status') status: string,
        @Res() res,
    ) {
        const result = await this.paymentUtilService.verify(authority, status);
        if (status === 'OK') {
            res.redirect(`${process.env.FRONTEND_URL}/success`);
        } else {
            res.redirect(`${process.env.FRONTEND_URL}/failed`);
        }
    }
}