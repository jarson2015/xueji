import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AllowanceGoalStatus } from '../common/enums';
import { User } from './user.entity';

@Entity('allowance_goals')
export class AllowanceGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ name: 'target_cents', type: 'int' })
  targetCents: number;

  @Column({ name: 'saved_cents', type: 'int', default: 0 })
  savedCents: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: AllowanceGoalStatus.ACTIVE,
  })
  status: AllowanceGoalStatus;

  @Column({ name: 'cover_url', type: 'varchar', length: 255, nullable: true })
  coverUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
