import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishItem } from '../entities/wish-item.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { User } from '../entities/user.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { WishesService } from './wishes.service';
import { WishesController } from './wishes.controller';
import { StudentsModule } from '../students/students.module';
import { EventsModule } from '../events/events.module';
import { FamilyModule } from '../family/family.module';
import { PointsModule } from '../points/points.module';
import { GrowthModule } from '../growth/growth.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WishItem,
      WishRedeem,
      User,
      PointLedger,
      TaskAssign,
    ]),
    forwardRef(() => StudentsModule),
    forwardRef(() => FamilyModule),
    EventsModule,
    PointsModule,
    forwardRef(() => GrowthModule),
    PushModule,
  ],
  providers: [WishesService],
  controllers: [WishesController],
  exports: [WishesService],
})
export class WishesModule {}
