import { Body, Controller, Get, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UserGuard } from '../auth/guards/user.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('withdrawals')
@ApiTags('withdrawals')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  @UseGuards(UserGuard)
  @ApiOperation({ summary: 'Request a withdrawal to TRON wallet' })
  @ApiResponse({ status: 201, description: 'Withdrawal created (pending)' })
  @ApiResponse({ status: 400, description: 'Validation or insufficient balance' })
  async requestWithdrawal(
    @CurrentUser() user: User,
    @Body() dto: CreateWithdrawalDto,
  ) {
    const withdrawal = await this.withdrawalService.requestWithdrawal(user.id, dto);
    return this.toResponse(withdrawal);
  }

  @Get('me')
  @UseGuards(UserGuard)
  @ApiOperation({ summary: 'Get current user withdrawal history' })
  @ApiResponse({ status: 200, description: 'List of withdrawals' })
  async getMyWithdrawals(@CurrentUser() user: User) {
    const list = await this.withdrawalService.findByUserId(user.id);
    return list.map((w) => this.toResponse(w));
  }

  private toResponse(w: {
    id: string;
    amount: string;
    walletAddress: string;
    status: string;
    txHash: string | null;
    failureReason: string | null;
    createdAt: Date;
    processedAt: Date | null;
  }) {
    return {
      id: w.id,
      amount: parseFloat(w.amount),
      walletAddress: w.walletAddress,
      status: w.status,
      txHash: w.txHash ?? undefined,
      failureReason: w.failureReason ?? undefined,
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt?.toISOString(),
    };
  }
}
