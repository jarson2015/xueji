import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishItem } from '../entities/wish-item.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { CheckIn } from '../entities/checkin.entity';
import { User } from '../entities/user.entity';
import { ProgressExtrasService } from './progress-extras.service';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WishItem, WishRedeem, CheckIn, User]),
    forwardRef(() => FamilyModule),
  ],
  providers: [ProgressExtrasService],
  exports: [ProgressExtrasService],
})
export class ProgressExtrasModule {}
