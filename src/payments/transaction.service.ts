import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Transaction } from './transaction.entity';

@Injectable()
export class TransactionService extends BaseRepository<Transaction> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {
    super(transactionRepository);
  }
}
