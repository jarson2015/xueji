import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilySettings } from '../entities/family-settings.entity';
import { shouldAutoSettleWeeklyDigest } from '../task-lifecycle/lifecycle';
import { CheckinsService } from './checkins.service';

/**
 * 周末/周一早晨结算 weekly_digest 待入账积分。
 * 从 monitor/summary 读路径移出，避免家长看板 GET 写库。
 */
@Injectable()
export class WeeklyDigestSettleScheduler {
  private readonly logger = new Logger(WeeklyDigestSettleScheduler.name);

  constructor(
    @InjectRepository(FamilySettings)
    private readonly settings: Repository<FamilySettings>,
    private readonly checkins: CheckinsService,
  ) {}

  /** 上海时区：周六/日/一 06:05 */
  @Cron('5 6 * * 0,1,6', { timeZone: 'Asia/Shanghai' })
  async tick() {
    if (!shouldAutoSettleWeeklyDigest()) return;

    const rows = await this.settings.find({
      where: { rewardMode: 'weekly_digest' },
      select: ['parentId'],
    });
    if (!rows.length) return;

    for (const row of rows) {
      try {
        const result = await this.checkins.settleWeeklyDigestForParent(
          row.parentId,
        );
        if (result.settled > 0) {
          this.logger.log(
            `weeklyDigest parent=${row.parentId} settled=${result.settled} points=${result.points}`,
          );
        }
      } catch (e: any) {
        this.logger.warn(
          `weeklyDigest parent=${row.parentId} failed: ${e?.message || e}`,
        );
      }
    }
  }
}
