import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  checkoutUrl: string | null;

  @Column({type: 'varchar', length: 500, nullable: true})
  refId: string | null;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message: string | null;

  @Column({ type: 'timestamp', nullable: true })
  doneAt: Date | null;

  @Column({nullable: true})
  transactionId: number;

  @ManyToOne(() => Transaction, (tx) => tx.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
