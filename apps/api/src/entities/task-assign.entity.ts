import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AssignStatus } from '../common/enums';
import { Task } from './task.entity';
import { User } from './user.entity';
import { CheckIn } from './checkin.entity';

@Entity('task_assigns')
@Unique(['taskId', 'studentId'])
export class TaskAssign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id' })
  taskId: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => Task, (t) => t.assigns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'progress_value', type: 'float', default: 0 })
  progressValue: number;

  @Column({ name: 'progress_percent', type: 'float', default: 0 })
  progressPercent: number;

  @Column({ type: 'varchar', length: 20, default: AssignStatus.ACTIVE })
  status: AssignStatus;

  /** YYYY-MM-DD for daily period tracking */
  @Column({ name: 'period_key', type: 'varchar', length: 32, nullable: true })
  periodKey: string | null;

  /** Student deferred this assign for the calendar day (YYYY-MM-DD Shanghai) */
  @Column({ name: 'skip_date', type: 'varchar', length: 10, nullable: true })
  skipDate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CheckIn, (c) => c.assign)
  checkins: CheckIn[];
}
