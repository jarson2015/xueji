import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { TaskStep } from '../entities/task-step.entity';
import { CheckIn } from '../entities/checkin.entity';
import { User } from '../entities/user.entity';
import { TaskProposal } from '../entities/task-proposal.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskStreakService } from './task-streak.service';
import { StudentsModule } from '../students/students.module';
import { FamilyModule } from '../family/family.module';
import { EventsModule } from '../events/events.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskAssign, TaskStep, CheckIn, User, TaskProposal]),
    forwardRef(() => StudentsModule),
    forwardRef(() => FamilyModule),
    EventsModule,
    PushModule,
  ],
  providers: [TasksService, TaskStreakService],
  controllers: [TasksController],
  exports: [TasksService, TaskStreakService],
})
export class TasksModule {}
