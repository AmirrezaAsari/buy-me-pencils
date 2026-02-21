import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoService } from './crypto.service';

/**
 * CryptoModule provides AES-256 encryption utilities.
 * Marked Global so it can be injected anywhere without re-importing.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
