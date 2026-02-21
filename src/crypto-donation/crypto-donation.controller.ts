import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CryptoPaymentService } from './crypto-payment.service';
import { CreateCryptoPaymentDto } from './dto/create-crypto-payment.dto';
import { CreateCryptoPaymentResponseDto } from './dto/create-crypto-payment-response.dto';

/**
 * Controller for crypto donation flow.
 * POST /payments/crypto - Create payment invoice.
 * Rate limiting: add @UseGuards(ThrottlerGuard) when @nestjs/throttler is installed.
 */
@Controller('payments')
@ApiTags('crypto-donations')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class CryptoDonationController {
  constructor(private readonly cryptoPaymentService: CryptoPaymentService) {}

  @Post('crypto')
  @ApiOperation({ summary: 'Create crypto payment invoice' })
  @ApiResponse({ status: 201, description: 'Payment invoice created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async createPayment(
    @Body() dto: CreateCryptoPaymentDto,
  ): Promise<CreateCryptoPaymentResponseDto> {
    return this.cryptoPaymentService.createPayment(dto);
  }
}
