import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CryptoPayment } from './crypto-payment.entity';

/**
 * Record of a confirmed blockchain transaction (incoming USDT).
 */
@Entity('crypto_transactions')
export class CryptoTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => CryptoPayment, (payment) => payment.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'paymentId' })
  payment: CryptoPayment;

  @Column({ type: 'varchar', length: 128 })
  txHash: string;

  @Column({ type: 'varchar', length: 64 })
  fromAddress: string;

  @Column({ type: 'varchar', length: 64 })
  toAddress: string;

  @Column({ type: 'decimal', precision: 24, scale: 6 })
  amount: string;

  @Column({ type: 'int' })
  confirmations: number;

  @CreateDateColumn()
  createdAt: Date;
}
