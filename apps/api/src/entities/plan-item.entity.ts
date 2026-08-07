import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudyPlan } from './study-plan.entity';
import { Task } from './task.entity';

@Entity('plan_items')
export class PlanItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => StudyPlan, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: StudyPlan;

  @Column({ name: 'task_id', type: 'int', nullable: true })
  taskId: number | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  @Column({ name: 'custom_title', type: 'varchar', length: 120, nullable: true })
  customTitle: string | null;

  @Column({ name: 'planned_date', type: 'date', nullable: true })
  plannedDate: string | null;

  @Column({ default: false })
  done: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
