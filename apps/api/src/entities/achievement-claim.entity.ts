import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AchievementClaimStatus = 'draft' | 'posted' | 'cancelled';

@Entity('achievement_claims')
export class AchievementClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'family_id' })
  familyId: number;

  @Column({ name: 'student_user_id' })
  studentUserId: number;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: AchievementClaimStatus;

  @Column({ name: 'posted_ledger_id', type: 'int', nullable: true })
  postedLedgerId: number | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ name: 'posted_by', type: 'int', nullable: true })
  postedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'posted_at', type: 'datetime', nullable: true })
  postedAt: Date | null;
}
