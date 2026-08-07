import { Module } from '@nestjs/common';
import { PointsLedgerService } from './points-ledger.service';

@Module({
  providers: [PointsLedgerService],
  exports: [PointsLedgerService],
})
export class PointsModule {}
