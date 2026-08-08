import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAssign } from '../entities/task-assign.entity';
import { CheckIn } from '../entities/checkin.entity';
import { User } from '../entities/user.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { PointGift } from '../entities/point-gift.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { StudentsModule } from '../students/students.module';
import { TasksModule } from '../tasks/tasks.module';
import { PlansModule } from '../plans/plans.module';
import { ProgressExtrasModule } from '../common/progress-extras.module';
import { FamilyModule } from '../family/family.module';
import { PactsModule } from '../pacts/pacts.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskAssign,
      CheckIn,
      User,
      WishRedeem,
      PointGift,
    ]),
    forwardRef(() => StudentsModule),
    forwardRef(() => TasksModule),
    PlansModule,
    ProgressExtrasModule,
    FamilyModule,
    forwardRef(() => PactsModule),
    EventsModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
