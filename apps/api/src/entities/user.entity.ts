import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { ParentStudent } from './parent-student.entity';
import { Task } from './task.entity';
import { StudyPlan } from './study-plan.entity';
import { PointLedger } from './point-ledger.entity';
import { WishItem } from './wish-item.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 120 })
  username: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ name: 'points_balance', type: 'int', default: 0 })
  pointsBalance: number;

  /**
   * Legacy plaintext column — kept nullable for migration only.
   * New codes are stored as loginCodeHash; plaintext is returned once on create/refresh.
   */
  @Column({ name: 'login_code', type: 'varchar', length: 16, nullable: true })
  loginCode: string | null;

  @Column({
    name: 'login_code_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  loginCodeHash: string | null;

  /** Last 2 digits for parent UI reminder (not enough to log in alone). */
  @Column({ name: 'login_code_hint', type: 'varchar', length: 2, nullable: true })
  loginCodeHint: string | null;

  @Column({ name: 'login_code_expires_at', type: 'datetime', nullable: true })
  loginCodeExpiresAt: Date | null;

  /**
   * Student session epoch: bumped on login-code refresh and password change.
   * Embedded in JWT as `pe` for code / password / proxy; mismatch → 401.
   */
  @Column({ name: 'proxy_epoch', type: 'int', default: 0 })
  proxyEpoch: number;

  /** 家里排行：1=大孩；越小越年长；null=未设置（公平提示用创建时间近似） */
  @Column({ name: 'birth_order', type: 'int', nullable: true })
  birthOrder: number | null;

  /**
   * 学生个人年龄段：young | general | teen；null=使用家庭默认 age_band
   */
  @Column({ name: 'age_band', type: 'varchar', length: 16, nullable: true })
  ageBand: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ParentStudent, (ps) => ps.parent)
  childrenLinks: ParentStudent[];

  @OneToMany(() => ParentStudent, (ps) => ps.student)
  parentLinks: ParentStudent[];

  @OneToMany(() => Task, (t) => t.creator)
  createdTasks: Task[];

  @OneToMany(() => StudyPlan, (p) => p.student)
  plans: StudyPlan[];

  @OneToMany(() => PointLedger, (l) => l.student)
  ledgers: PointLedger[];

  @OneToMany(() => WishItem, (w) => w.student)
  wishes: WishItem[];
}
