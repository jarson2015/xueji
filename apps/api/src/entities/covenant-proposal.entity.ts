import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export type CovenantProposalStatus = 'pending' | 'adopted' | 'dismissed';

/** 孩子提议的公约条款，供家长采纳 */
@Entity('covenant_proposals')
export class CovenantProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'proposed_text', type: 'varchar', length: 300 })
  proposedText: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: CovenantProposalStatus;

  @Column({ name: 'resolved_by_parent_id', type: 'int', nullable: true })
  resolvedByParentId: number | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
