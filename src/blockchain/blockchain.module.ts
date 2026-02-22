import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { TronTransferService } from './tron-transfer.service';

@Module({
  imports: [ConfigModule],
  providers: [BlockchainService, TronTransferService],
  exports: [BlockchainService, TronTransferService],
})
export class BlockchainModule {}
