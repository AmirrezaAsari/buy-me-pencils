import { Logger } from '@nestjs/common';

/**
 * Validates required environment variables on startup.
 * Does not log sensitive values (e.g. private keys).
 */
export function validateEnvOnStartup(): void {
  const logger = new Logger('EnvValidation');
  const errors: string[] = [];

  // Required for app
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    errors.push('JWT_SECRET must be set and at least 16 characters');
  }

  // Required for crypto/encryption
  if (!process.env.ENCRYPTION_SECRET || process.env.ENCRYPTION_SECRET.length < 32) {
    errors.push('ENCRYPTION_SECRET must be set and at least 32 characters');
  }

  // Withdrawal / TRON: if master address is set, key must be set (and never logged)
  const masterAddress = process.env.TRON_MASTER_ADDRESS;
  const masterKey = process.env.TRON_MASTER_PRIVATE_KEY;
  if (masterAddress && masterAddress.length > 0) {
    if (!masterKey || masterKey.length === 0) {
      errors.push('TRON_MASTER_PRIVATE_KEY must be set when TRON_MASTER_ADDRESS is set');
    }
  }

  // Redis for BullMQ: defaults used if not set (localhost:6379)

  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach((e) => logger.error(`  - ${e}`));
    throw new Error('Environment validation failed. Fix the above and restart.');
  }

  logger.log('Environment validation passed');
}
