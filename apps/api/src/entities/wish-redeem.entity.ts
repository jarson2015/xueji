import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RedeemStatus } from '../common/enums';
import { WishItem } from './wish-item.entity';
import { User } from './user.entity';

@Entity('wish_redeems')
export class WishRedeem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wish_id' })
  wishId: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => WishItem, (w) => w.redeems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wish_id' })
  wish: WishItem;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'varchar', length: 20, default: RedeemStatus.PENDING })
  status: RedeemStatus;

  /** Points deducted at redeem time (stable for refund if wish price changes) */
  @Column({ name: 'cost_points', type: 'int', default: 0 })
  costPoints: number;

  /** e.g. chore_waiver when golden finger is approved */
  @Column({ name: 'effect_type', type: 'varchar', length: 32, nullable: true })
  effectType: string | null;

  @Column({ name: 'effect_assign_id', type: 'int', nullable: true })
  effectAssignId: number | null;

  @Column({ name: 'effect_title', type: 'varchar', length: 120, nullable: true })
  effectTitle: string | null;

  /** 学生确认「收到了」兑现 */
  @Column({ name: 'student_ack_at', type: 'datetime', nullable: true })
  studentAckAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
