import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Lightweight audit trail for co-parent / dispute review */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actor_id', type: 'int' })
  actorId: number;

  @Column({ name: 'actor_name', type: 'varchar', length: 64, nullable: true })
  actorName: string | null;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action: string;

  @Column({ name: 'target_type', type: 'varchar', length: 32, nullable: true })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId: number | null;

  @Column({ name: 'student_id', type: 'int', nullable: true })
  studentId: number | null;

  @Column({ name: 'detail', type: 'simple-json', nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
