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

@Entity('student_weekly_reviews')
@Index(['studentId', 'weekKey'], { unique: true })
export class StudentWeeklyReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'week_key', length: 12 })
  weekKey: string;

  @Column({ name: 'proud_text', length: 120, default: '' })
  proudText: string;

  @Column({ name: 'change_text', length: 120, default: '' })
  changeText: string;

  @Column({ name: 'promise_text', length: 120, default: '' })
  promiseText: string;

  /** 可选：引用的家庭说说帖 id（弱连接） */
  @Column({ name: 'journal_post_id', type: 'int', nullable: true })
  journalPostId: number | null;

  /** 引用时固化的正文摘要；删帖后仍可读 */
  @Column({
    name: 'journal_post_summary',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  journalPostSummary: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
