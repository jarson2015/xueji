import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PointGiftReason, PointGiftStatus } from '../common/enums';
import { User } from './user.entity';

/** 兄妹积分赠予（心意分享；收下时转账；不可讨回） */
@Entity('point_gifts')
export class PointGift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'from_student_id' })
  fromStudentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_student_id' })
  fromStudent: User;

  @Column({ name: 'to_student_id' })
  toStudentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_student_id' })
  toStudent: User;

  @Column({ name: 'amount_points', type: 'int' })
  amountPoints: number;

  @Column({ type: 'varchar', length: 20, default: PointGiftStatus.PENDING })
  status: PointGiftStatus;

  @Column({ name: 'reason_code', type: 'varchar', length: 20 })
  reasonCode: PointGiftReason | string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  note: string | null;

  @Column({ name: 'parent_decided_at', type: 'datetime', nullable: true })
  parentDecidedAt: Date | null;

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
