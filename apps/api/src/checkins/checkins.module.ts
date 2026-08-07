import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../entities/checkin.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { User } from '../entities/user.entity';
import { PlanItem } from '../entities/plan-item.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { FamilySettings } from '../entities/family-settings.entity';
import { CheckinsService } from './checkins.service';
import { CheckinsController } from './checkins.controller';
import { AutoConfirmPendingScheduler } from './auto-confirm-pending.scheduler';
import { WeeklyDigestSettleScheduler } from './weekly-digest-settle.scheduler';
import { StudentsModule } from '../students/students.module';
import { EventsModule } from '../events/events.module';
import { ProgressExtrasModule } from '../common/progress-extras.module';
import { TasksModule } from '../tasks/tasks.module';
import { FamilyModule } from '../family/family.module';
import { GrowthModule } from '../growth/growth.module';
import { PointsModule } from '../points/points.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckIn,
      TaskAssign,
      User,
      PlanItem,
      PointLedger,
      FamilySettings,
    ]),
    forwardRef(() => StudentsModule),
    forwardRef(() => TasksModule),
    forwardRef(() => FamilyModule),
    EventsModule,
    ProgressExtrasModule,
    PointsModule,
    forwardRef(() => GrowthModule),
    PushModule,
  ],
  providers: [
    CheckinsService,
    AutoConfirmPendingScheduler,
    WeeklyDigestSettleScheduler,
  ],
  controllers: [CheckinsController],
  exports: [CheckinsService, AutoConfirmPendingScheduler],
})
export class CheckinsModule {}
