import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('parent_students')
@Unique(['parentId', 'studentId'])
export class ParentStudent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'parent_id' })
  parentId: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, (u) => u.childrenLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: User;

  @ManyToOne(() => User, (u) => u.parentLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
