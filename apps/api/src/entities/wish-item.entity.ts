import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WishType } from '../common/enums';
import { User } from './user.entity';
import { WishRedeem } from './wish-redeem.entity';

@Entity('wish_items')
export class WishItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ name: 'parent_id' })
  parentId: number;

  @ManyToOne(() => User, (u) => u.wishes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: User;

  @Column({ length: 120 })
  title: string;

  @Column({ name: 'cost_points', type: 'int' })
  costPoints: number;

  /** normal | golden_finger — golden finger redeems with points, waives one chore */
  @Column({ type: 'varchar', length: 20, default: WishType.NORMAL })
  type: WishType;

  /** item | experience | company | choice — values guide (ignored for golden_finger) */
  @Column({ type: 'varchar', length: 20, default: 'experience' })
  kind: string;

  @Column({ default: true })
  active: boolean;

  /** Student-proposed wish awaiting parent cost + shelf */
  @Column({ default: false })
  proposed: boolean;

  /** 近端可兑：优先出现在 nextWish / 学生商店置顶 */
  @Column({ name: 'is_near_term', default: false })
  isNearTerm: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WishRedeem, (r) => r.wish)
  redeems: WishRedeem[];
}
