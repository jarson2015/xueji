import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export type GrowthMilestoneKind = 'auto' | 'manual';

@Entity('growth_milestones')
export class GrowthMilestone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 16, default: 'manual' })
  kind: GrowthMilestoneKind;

  @Column({ name: 'checkin_id', type: 'int', nullable: true })
  checkinId: number | null;

  @Column({ name: 'task_id', type: 'int', nullable: true })
  taskId: number | null;

  @Column({ name: 'occurred_at', type: 'datetime' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
