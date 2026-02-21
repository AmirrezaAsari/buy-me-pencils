import { ApiProperty } from '@nestjs/swagger';

/**
 * Response after creating a crypto payment invoice.
 */
export class CreateCryptoPaymentResponseDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty({ description: 'TRON address to send USDT TRC20' })
  address: string;

  @ApiProperty({ description: 'Amount in USDT (6 decimals)' })
  amountCrypto: string;

  @ApiProperty({ example: 'USDT' })
  currency: string;

  @ApiProperty({ description: 'ISO timestamp when payment expires' })
  expiresAt: string;
}
