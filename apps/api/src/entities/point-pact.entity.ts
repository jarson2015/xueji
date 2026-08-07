import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PointPactStatus } from '../common/enums';
import { User } from './user.entity';

/** 兄妹积分约定（暂时借用积分，按约定还回；不是金钱借贷） */
@Entity('point_pacts')
export class PointPact {
  @PrimaryGeneratedColumn()
  id: number;

  /** 借出方 */
  @Column({ name: 'lender_id' })
  lenderId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lender_id' })
  lender: User;

  /** 借用方 */
  @Column({ name: 'borrower_id' })
  borrowerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'borrower_id' })
  borrower: User;

  /** 约定积分数（借出时转移） */
  @Column({ name: 'amount_points', type: 'int' })
  amountPoints: number;

  /** 约定还回日 YYYY-MM-DD（上海日历） */
  @Column({ name: 'due_date', type: 'varchar', length: 10 })
  dueDate: string;

  @Column({ type: 'varchar', length: 20, default: PointPactStatus.PENDING })
  status: PointPactStatus;

  /** 已计提的逾期补分（每天 1 分，有上限；结清前不扣余额） */
  @Column({ name: 'overdue_extra_accrued', type: 'int', default: 0 })
  overdueExtraAccrued: number;

  @Column({ name: 'overdue_extra_paid', type: 'int', default: 0 })
  overdueExtraPaid: number;

  /** 上次计提到的日期 YYYY-MM-DD */
  @Column({ name: 'last_accrual_date', type: 'varchar', length: 10, nullable: true })
  lastAccrualDate: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  note: string | null;

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'repaid_at', type: 'datetime', nullable: true })
  repaidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
