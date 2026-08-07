import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConfirmStatus } from '../common/enums';
import { TaskAssign } from './task-assign.entity';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity('checkins')
export class CheckIn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ name: 'task_id', type: 'int', nullable: true })
  taskId: number | null;

  @Column({ name: 'assign_id', type: 'int', nullable: true })
  assignId: number | null;

  @Column({ name: 'plan_item_id', type: 'int', nullable: true })
  planItemId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  @ManyToOne(() => TaskAssign, (a) => a.checkins, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assign_id' })
  assign: TaskAssign | null;

  @Column({ type: 'float', default: 1 })
  value: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Optional short reflection answer (education loop) */
  @Column({ name: 'reflection_text', type: 'varchar', length: 500, nullable: true })
  reflectionText: string | null;

  /** 打卡前可选情绪：happy / ok / tired / hard */
  @Column({ name: 'mood_tag', type: 'varchar', length: 16, nullable: true })
  moodTag: string | null;

  /** Prompt shown when the reflection was written */
  @Column({ name: 'reflection_prompt', type: 'varchar', length: 120, nullable: true })
  reflectionPrompt: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({
    name: 'confirm_status',
    type: 'varchar',
    length: 20,
    default: ConfirmStatus.NONE,
  })
  confirmStatus: ConfirmStatus;

  /** JSON array of completed step ids */
  @Column({ name: 'completed_step_ids', type: 'simple-json', nullable: true })
  completedStepIds: number[] | null;

  /** Parent praise on confirm (scheme A) */
  @Column({ name: 'parent_liked', type: 'boolean', default: false })
  parentLiked: boolean;

  @Column({ name: 'parent_comment', type: 'varchar', length: 200, nullable: true })
  parentComment: string | null;

  /** Makeup / late checkin */
  @Column({ name: 'is_makeup', type: 'boolean', default: false })
  isMakeup: boolean;

  @Column({ name: 'makeup_period_key', type: 'varchar', length: 32, nullable: true })
  makeupPeriodKey: string | null;

  /** 客户端幂等 ID，离线同步去重 */
  @Column({ name: 'client_id', type: 'varchar', length: 36, nullable: true, unique: true })
  clientId: string | null;

  /** 本次打卡前使用了专注番茄钟 */
  @Column({ name: 'used_focus', type: 'boolean', default: false })
  usedFocus: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
