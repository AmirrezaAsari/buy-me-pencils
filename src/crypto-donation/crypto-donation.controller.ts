import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CryptoPaymentService } from './crypto-payment.service';
import { CreateCryptoPaymentDto } from './dto/create-crypto-payment.dto';
import { CreateCryptoPaymentResponseDto } from './dto/create-crypto-payment-response.dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { UserGuard } from '../auth/guards/user.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

/**
 * Controller for crypto donation flow.
 * POST /payments/crypto - Create payment invoice.
 * GET /payments/crypto/me - List current user's confirmed payments.
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

  @Get('crypto/me')
  @UseGuards(UserGuard)
  @ApiOperation({ summary: 'Get current user\'s confirmed crypto payments' })
  @ApiResponse({ status: 200, description: 'List of confirmed payments' })
  async getMyPayments(@CurrentUser() user: User) {
    const payments = await this.cryptoPaymentService.findConfirmedByCreator(
      user.id,
    );
    return payments.map((p) => ({
      id: p.id,
      amount: parseFloat(BlockchainService.rawToUsdt(p.amountExpected)),
      currency: p.currency,
      status: p.status,
      txHash: p.txHash,
      createdAt: p.createdAt.toISOString(),
    }));
  }
}
