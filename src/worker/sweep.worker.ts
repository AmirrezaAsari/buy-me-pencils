import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SweepService } from '../sweep/sweep.service';

/**
 * Cron worker that sweeps confirmed payments to master wallet.
 * Runs every 2 minutes.
 */
@Injectable()
export class SweepWorker {
  private readonly logger = new Logger(SweepWorker.name);

  constructor(private readonly sweepService: SweepService) {}

  @Cron('0 */2 * * * *') // Every 2 minutes
  async handleSweep() {
    try {
      if (!this.sweepService.isConfigured()) return;
      const unswept = await this.sweepService.getUnsweptPayments();
      for (const payment of unswept) {
        try {
          await this.sweepService.sweepPayment(payment);
        } catch (err) {
          this.logger.warn(
            `Failed to sweep payment ${payment.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error('Sweep worker error', err);
    }
  }
}
