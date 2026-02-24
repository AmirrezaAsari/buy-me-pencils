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
      if (!this.sweepService.isConfigured()){
        this.logger.warn('Sweep is not configured, skipping');
        return;
      }
      this.logger.debug('Sweep is configured, getting unswept payments');
      const unswept = await this.sweepService.getUnsweptPayments();
      this.logger.log(`Sweep run: ${unswept.length} unswept payment(s)`);
      for (const payment of unswept) {
        try {
          this.logger.debug(`Sweeping payment ${payment.id}`);
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
