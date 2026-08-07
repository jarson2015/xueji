import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PointReason } from '../common/enums';
import { User } from './user.entity';

@Entity('point_ledgers')
export class PointLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, (u) => u.ledgers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'varchar', length: 32 })
  reason: PointReason;

  @Column({ name: 'ref_id', type: 'int', nullable: true })
  refId: number | null;

  @Column({ length: 200, type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
