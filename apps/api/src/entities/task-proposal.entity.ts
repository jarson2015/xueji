import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskCategory } from '../common/enums';
import { User } from './user.entity';
import { Task } from './task.entity';

export type TaskProposalStatus = 'pending' | 'approved' | 'rejected';

/** 孩子提议的学习/生活小任务，家长审定后发布 */
@Entity('task_proposals')
export class TaskProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskCategory.STUDY,
  })
  category: TaskCategory;

  /** 建议时长（分钟）；null = 一次完成 */
  @Column({ name: 'suggested_minutes', type: 'int', nullable: true })
  suggestedMinutes: number | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: TaskProposalStatus;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ name: 'approved_task_id', type: 'int', nullable: true })
  approvedTaskId: number | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_task_id' })
  approvedTask: Task | null;

  @Column({ name: 'reject_note', type: 'varchar', length: 200, nullable: true })
  rejectNote: string | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
