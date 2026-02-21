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
 * Creator withdrawal request (basic structure).
 * Creator requests to move balance to external wallet.
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

  @CreateDateColumn()
  createdAt: Date;
}
