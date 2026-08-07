import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrowthMilestone } from '../entities/growth-milestone.entity';
import { CheckIn } from '../entities/checkin.entity';
import { GrowthService } from './growth.service';
import { GrowthController } from './growth.controller';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GrowthMilestone, CheckIn]),
    forwardRef(() => StudentsModule),
  ],
  providers: [GrowthService],
  controllers: [GrowthController],
  exports: [GrowthService],
})
export class GrowthModule {}
