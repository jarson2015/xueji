import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  AllowanceCategory,
  AllowanceEntryStatus,
  AllowanceKind,
} from '../common/enums';
import { User } from './user.entity';
import { AllowanceAccount } from './allowance-account.entity';
import { AllowanceGoal } from './allowance-goal.entity';

@Entity('allowance_entries')
export class AllowanceEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'account_id' })
  accountId: number;

  @ManyToOne(() => AllowanceAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AllowanceAccount;

  /** Income positive, spend/save negative */
  @Column({ name: 'delta_cents', type: 'int' })
  deltaCents: number;

  @Column({ type: 'varchar', length: 24 })
  kind: AllowanceKind;

  @Column({ type: 'varchar', length: 24, nullable: true })
  category: AllowanceCategory | null;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 255, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 16, default: AllowanceEntryStatus.POSTED })
  status: AllowanceEntryStatus;

  @Column({ name: 'goal_id', type: 'int', nullable: true })
  goalId: number | null;

  @ManyToOne(() => AllowanceGoal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'goal_id' })
  goal: AllowanceGoal | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ name: 'review_note', type: 'varchar', length: 200, nullable: true })
  reviewNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'posted_at', type: 'datetime', nullable: true })
  postedAt: Date | null;

  /** V1.5：如 achievement_claim */
  @Column({ name: 'ref_type', type: 'varchar', length: 32, nullable: true })
  refType: string | null;

  @Column({ name: 'ref_id', type: 'int', nullable: true })
  refId: number | null;
}
