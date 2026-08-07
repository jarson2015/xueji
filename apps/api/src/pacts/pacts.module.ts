import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointPact } from '../entities/point-pact.entity';
import { User } from '../entities/user.entity';
import { PactsService } from './pacts.service';
import { PactsController } from './pacts.controller';
import { StudentsModule } from '../students/students.module';
import { FamilyModule } from '../family/family.module';
import { EventsModule } from '../events/events.module';
import { PushModule } from '../push/push.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointPact, User]),
    forwardRef(() => StudentsModule),
    forwardRef(() => FamilyModule),
    EventsModule,
    PushModule,
    PointsModule,
  ],
  providers: [PactsService],
  controllers: [PactsController],
  exports: [PactsService],
})
export class PactsModule {}
