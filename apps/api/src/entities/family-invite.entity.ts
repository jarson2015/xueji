import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('family_invites')
@Unique(['code'])
export class FamilyInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'from_parent_id' })
  fromParentId: number;

  @Column({ length: 8 })
  code: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'accepted_by_parent_id', type: 'int', nullable: true })
  acceptedByParentId: number | null;

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
