import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { WithdrawalStatus } from './withdrawal-status.enum';

/**
 * Creator withdrawal request.
 * Creator requests to move balance to external TRON wallet (USDT TRC20).
 */
@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 24, scale: 6 })
  amount: string;

  @Column({ type: 'varchar', length: 64 })
  walletAddress: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  /** TRON transaction hash after successful transfer */
  @Column({ type: 'varchar', length: 128, nullable: true })
  txHash: string | null;

  /** Error or rejection reason when status is failed/rejected */
  @Column({ type: 'varchar', length: 512, nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  /** When withdrawal was completed or failed (blockchain finalized) */
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;
}
