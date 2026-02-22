import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

/**
 * DTO for requesting a withdrawal to a TRON wallet.
 * TRON address format is validated in WithdrawalService.
 */
export class CreateWithdrawalDto {
  @ApiProperty({ description: 'Amount in USDT to withdraw', minimum: 0.01 })
  @IsNumber()
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;

  @ApiProperty({ description: 'TRON (TRC20) wallet address to receive USDT' })
  @IsString()
  walletAddress: string;
}
