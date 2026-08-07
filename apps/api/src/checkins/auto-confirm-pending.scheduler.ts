import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { FamilySettings } from '../entities/family-settings.entity';
import { formatDate, formatShanghaiHm } from '../common/date-util';
import { CheckinsService } from './checkins.service';

/**
 * 每分钟（Asia/Shanghai）扫描已开启「夜间自动确认」的家庭；
 * 当前 HH:mm 匹配且当日未跑过则批处理（跳过补上进度）。
 *
 * 开销优化：
 * - 无启用家庭时 5 分钟内不再查库
 * - 有启用时按「时间点」等值过滤，绝大多数分钟零行
 */
@Injectable()
export class AutoConfirmPendingScheduler {
  private readonly logger = new Logger(AutoConfirmPendingScheduler.name);
  /** 无启用家庭时跳过查库至该时间戳 */
  private emptyUntilMs = 0;

  constructor(
    @InjectRepository(FamilySettings)
    private readonly settings: Repository<FamilySettings>,
    private readonly checkins: CheckinsService,
  ) {}

  /** 设置里打开开关后可调用，立刻解除空结果退避 */
  bumpEnabledCache() {
    this.emptyUntilMs = 0;
  }

  @Cron('* * * * *', { timeZone: 'Asia/Shanghai' })
  async tick() {
    const now = Date.now();
    if (now < this.emptyUntilMs) return;

    const enabledCount = await this.settings.count({
      where: { autoConfirmPendingEnabled: true },
    });
    if (enabledCount === 0) {
      this.emptyUntilMs = now + 5 * 60_000;
      return;
    }

    const nowHm = formatShanghaiHm();
    const today = formatDate();

    // 时间已在 PUT 时规范为 HH:mm；按此刻等值过滤
    const rows = await this.settings.find({
      where: [
        {
          autoConfirmPendingEnabled: true,
          autoConfirmPendingTime: nowHm,
          autoConfirmPendingLastRunDate: IsNull(),
        },
        {
          autoConfirmPendingEnabled: true,
          autoConfirmPendingTime: nowHm,
          autoConfirmPendingLastRunDate: Not(today),
        },
      ],
    });

    for (const row of rows) {
      if (row.autoConfirmPendingLastRunDate === today) continue;

      row.autoConfirmPendingLastRunDate = today;
      await this.settings.save(row);

      try {
        const result = await this.checkins.autoConfirmPendingForParent(
          row.parentId,
        );
        this.logger.log(
          `autoConfirm parent=${row.parentId} time=${nowHm} approved=${result.approved} failed=${result.failed}`,
        );
      } catch (e: any) {
        this.logger.warn(
          `autoConfirm parent=${row.parentId} failed: ${e?.message || e}`,
        );
      }
    }
  }
}
