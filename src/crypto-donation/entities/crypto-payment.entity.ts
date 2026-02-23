import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { CryptoTransaction } from './crypto-transaction.entity';
import { CryptoPaymentStatus } from './crypto-payment-status.enum';

/**
 * Crypto payment invoice for USDT TRC20 donations.
 * Each payment gets a unique TRON wallet address.
 */
@Entity('crypto_payments')
export class CryptoPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  /** Unique TRON wallet address for this payment */
  @Column({ type: 'varchar', length: 64 })
  address: string;

  /** AES-256 encrypted private key for sweep operations */
  @Column({ type: 'text' })
  privateKeyEncrypted: string;

  /** Expected amount in USDT (6 decimals for TRC20) */
  @Column({ type: 'decimal', precision: 24, scale: 6})
  amountExpected: string;

  @Column({ type: 'varchar', length: 10, default: 'USDT' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: CryptoPaymentStatus,
    default: CryptoPaymentStatus.PENDING,
  })
  status: CryptoPaymentStatus;

  /** Blockchain transaction hash once confirmed */
  @Column({ type: 'varchar', length: 128, nullable: true })
  txHash: string | null;

  /** Number of block confirmations received */
  @Column({ type: 'int', default: 0 })
  confirmations: number;

  @CreateDateColumn()
  createdAt: Date;

  /** Payment expires after this; after expiry, address may be reused or swept */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /** When USDT was swept to master wallet (null = not yet swept) */
  @Column({ type: 'timestamp', nullable: true })
  sweptAt: Date | null;

  @OneToMany(() => CryptoTransaction, (tx) => tx.payment)
  transactions: CryptoTransaction[];
}
