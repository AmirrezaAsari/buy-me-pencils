import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

/** Type of balance change */
export enum BalanceChangeType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

/**
 * Audit record of user balance changes.
 * Used for withdrawals (debit) and confirmed payments (credit).
 */
@Entity('user_balance_records')
export class UserBalanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Amount: positive for credit, negative for debit */
  @Column({ type: 'decimal', precision: 24, scale: 6 })
  amount: string;

  /** Balance after this change */
  @Column({ type: 'decimal', precision: 24, scale: 6 })
  balanceAfter: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: BalanceChangeType,
  })
  type: BalanceChangeType;

  /** e.g. 'crypto_payment', 'withdrawal' */
  @Column({ type: 'varchar', length: 50 })
  referenceType: string;

  /** e.g. crypto payment ID */
  @Column({ type: 'varchar', length: 128, nullable: true })
  referenceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
