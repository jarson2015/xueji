import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowanceAccount } from '../entities/allowance-account.entity';
import { AllowanceEntry } from '../entities/allowance-entry.entity';
import { AllowanceGoal } from '../entities/allowance-goal.entity';
import { AllowanceService } from './allowance.service';
import { AllowanceController } from './allowance.controller';
import { StudentsModule } from '../students/students.module';
import { FamilyModule } from '../family/family.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AllowanceAccount,
      AllowanceEntry,
      AllowanceGoal,
    ]),
    forwardRef(() => StudentsModule),
    forwardRef(() => FamilyModule),
    EventsModule,
  ],
  providers: [AllowanceService],
  controllers: [AllowanceController],
  exports: [AllowanceService],
})
export class AllowanceModule {}
