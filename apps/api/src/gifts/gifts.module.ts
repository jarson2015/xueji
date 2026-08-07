import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointGift } from '../entities/point-gift.entity';
import { User } from '../entities/user.entity';
import { GiftsService } from './gifts.service';
import { GiftsController } from './gifts.controller';
import { StudentsModule } from '../students/students.module';
import { FamilyModule } from '../family/family.module';
import { EventsModule } from '../events/events.module';
import { PushModule } from '../push/push.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointGift, User]),
    forwardRef(() => StudentsModule),
    forwardRef(() => FamilyModule),
    EventsModule,
    PushModule,
    PointsModule,
  ],
  providers: [GiftsService],
  controllers: [GiftsController],
  exports: [GiftsService],
})
export class GiftsModule {}
