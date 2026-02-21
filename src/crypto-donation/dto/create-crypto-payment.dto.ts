import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

/**
 * DTO for creating a crypto donation payment invoice.
 */
export class CreateCryptoPaymentDto {
  @ApiProperty({ description: 'UUID of the creator receiving the donation' })
  @IsUUID('4')
  creatorId: string;

  @ApiProperty({ description: 'Donation amount in USD (1:1 with USDT for now)', minimum: 0.01 })
  @IsNumber()
  @Min(0.01, { message: 'amountUSD must be at least 0.01' })
  amountUSD: number;
}
