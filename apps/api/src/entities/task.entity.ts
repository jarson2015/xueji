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
import {
  TargetType,
  TaskCategory,
  TaskSchedule,
  TimeSlot,
} from '../common/enums';
import { User } from './user.entity';
import { TaskAssign } from './task-assign.entity';
import { TaskStep } from './task-step.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'creator_id' })
  creatorId: number;

  @ManyToOne(() => User, (u) => u.createdTasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ type: 'varchar', length: 20, default: TaskSchedule.ONCE })
  schedule: TaskSchedule;

  @Column({ name: 'target_type', type: 'varchar', length: 20, default: TargetType.ONCE })
  targetType: TargetType;

  @Column({ name: 'target_value', type: 'int', default: 1 })
  targetValue: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskCategory.STUDY,
  })
  category: TaskCategory;

  @Column({
    name: 'time_slot',
    type: 'varchar',
    length: 20,
    default: TimeSlot.ANYTIME,
  })
  timeSlot: TimeSlot;

  @Column({ type: 'datetime', nullable: true })
  deadline: Date | null;

  @Column({ name: 'require_confirm', default: false })
  requireConfirm: boolean;

  /**
   * 共享完成：一人有效完成后，其余未完成指派归档为 shared_done（全家只需一人做）。
   */
  @Column({ name: 'shared_complete', default: false })
  sharedComplete: boolean;

  /**
   * 轮值：在共享完成基础上，按周期轮流主责；非主责不进今日催促。
   */
  @Column({ name: 'rotate_enabled', default: false })
  rotateEnabled: boolean;

  @Column({ name: 'points_reward', type: 'int', default: 10 })
  pointsReward: number;

  /**
   * 兴趣探索：偏好奇与投入，学生端庆祝弱化积分叙事。
   */
  @Column({ name: 'is_interest', default: false })
  isInterest: boolean;

  /** 给学生看的「为什么值得做」一句 */
  @Column({ name: 'meaning_note', type: 'varchar', length: 160, nullable: true })
  meaningNote: string | null;

  /** intro | practice | challenge */
  @Column({ name: 'difficulty_level', type: 'varchar', length: 16, default: 'practice' })
  difficultyLevel: string;

  /** 执行意图：锚定线索（如「吃完晚饭」） */
  @Column({ name: 'intention_cue', type: 'varchar', length: 120, nullable: true })
  intentionCue: string | null;

  /** 执行意图：then 动作（如「读 10 分钟」） */
  @Column({ name: 'intention_when', type: 'varchar', length: 120, nullable: true })
  intentionWhen: string | null;

  /** 微习惯：极小步开始 */
  @Column({ name: 'is_micro_habit', default: false })
  isMicroHabit: boolean;

  /**
   * 兄妹协作：每人各自完成，互见进度；与 shared_complete 互斥。
   */
  @Column({ name: 'joint_complete', default: false })
  jointComplete: boolean;

  @Column({ default: true })
  active: boolean;

  /** Template id when created from catalog (e.g. eq-mood, life-time) */
  @Column({
    name: 'source_template_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  sourceTemplateId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TaskAssign, (a) => a.task)
  assigns: TaskAssign[];

  @OneToMany(() => TaskStep, (s) => s.task)
  steps: TaskStep[];
}
