import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('student_weekly_goals')
@Index(['studentId', 'weekKey'], { unique: true })
export class StudentWeeklyGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'week_key', length: 12 })
  weekKey: string;

  @Column({ length: 80, default: '' })
  text: string;

  /** 主题周预设码：on_time | gratitude | … | custom | '' */
  @Column({ name: 'theme_preset', length: 32, default: '' })
  themePreset: string;

  /** 主题展示标题 */
  @Column({ name: 'theme_title', length: 40, default: '' })
  themeTitle: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('student_daily_focus')
@Index(['studentId', 'dayKey'], { unique: true })
export class StudentDailyFocus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'day_key', length: 10 })
  dayKey: string;

  @Column({ name: 'focus_keys', type: 'simple-json', default: '[]' })
  focusKeys: string[];

  @Column({ default: 0 })
  swaps: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
