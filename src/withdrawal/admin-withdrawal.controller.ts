import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WithdrawalService } from './withdrawal.service';
import { UserGuard } from '../auth/guards/user.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  WITHDRAWAL_QUEUE_NAME,
  WithdrawalJobPayload,
} from './withdrawal.processor';

@Controller('admin/withdrawals')
@ApiTags('admin-withdrawals')
@UseGuards(UserGuard, AdminGuard)
export class AdminWithdrawalController {
  constructor(
    private readonly withdrawalService: WithdrawalService,
    @InjectQueue(WITHDRAWAL_QUEUE_NAME)
    private readonly withdrawalQueue: Queue<WithdrawalJobPayload>,
  ) {}

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve pending withdrawal and enqueue transfer' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved and queued' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const enqueue = async (withdrawalId: string) => {
      await this.withdrawalQueue.add(
        'process',
        { withdrawalId },
        {
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 2000 },
          removeOnComplete: { count: 1000 },
        },
      );
    };
    const withdrawal = await this.withdrawalService.approveWithdrawal(id, enqueue);
    return {
      id: withdrawal.id,
      status: withdrawal.status,
      message: 'Withdrawal approved and queued for processing',
    };
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject pending withdrawal and return balance' })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async reject(@Param('id', ParseUUIDPipe) id: string) {
    const withdrawal = await this.withdrawalService.rejectWithdrawal(id);
    return {
      id: withdrawal.id,
      status: withdrawal.status,
      message: 'Withdrawal rejected, balance returned to user',
    };
  }
}
