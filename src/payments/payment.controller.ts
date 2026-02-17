import { Body, Controller, Get, Injectable, Post, Query } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { ApiTags } from "@nestjs/swagger";
import { createPaymentDto } from "./dto/create-payment.dto";

@Controller('payments')
@ApiTags('payments')
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
    ){}

    @Post()
    async create(
        @Body() inputs: createPaymentDto,
    ): Promise<object> {
        const payment = await this.paymentService.checkout(inputs);
        return {
            message: 'payment successull.',
            data: payment,
        }
    }

    @Get('/verify')
    async verify(
        @Query('Authority') authority: string,
        @Query('Status') status: string,
    ) {
        const result = await this.paymentService.verify(authority, status);

        return {
            message: 'payment verified.',
            data: result,
        }
    }
}