import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../entities/checkin.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { PointPact } from '../entities/point-pact.entity';
import { User } from '../entities/user.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { StudentsModule } from '../students/students.module';
import { ProgressExtrasModule } from '../common/progress-extras.module';
import { FamilyModule } from '../family/family.module';
import { CheckinsModule } from '../checkins/checkins.module';
import { TasksModule } from '../tasks/tasks.module';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckIn,
      TaskAssign,
      PointLedger,
      PointPact,
      User,
    ]),
    forwardRef(() => StudentsModule),
    ProgressExtrasModule,
    forwardRef(() => FamilyModule),
    forwardRef(() => CheckinsModule),
    forwardRef(() => TasksModule),
    forwardRef(() => GrowthModule),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
