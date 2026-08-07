import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('allowance_accounts')
export class AllowanceAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id', unique: true })
  studentId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  /** Balance in cents (¥1 = 100) */
  @Column({ name: 'balance_cents', type: 'int', default: 0 })
  balanceCents: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
