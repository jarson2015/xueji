import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyPlan } from '../entities/study-plan.entity';
import { PlanItem } from '../entities/plan-item.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudyPlan, PlanItem, TaskAssign])],
  providers: [PlansService],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
