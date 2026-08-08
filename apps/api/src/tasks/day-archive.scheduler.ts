import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilySettings } from '../entities/family-settings.entity';
import { StudentsService } from '../students/students.service';
import { TasksService } from './tasks.service';

/**
 * 每日 00:20（Asia/Shanghai）：对关闭补卡的家庭做周期归档。
 * 从 myTasks 读路径挪出，避免今日软刷新反复扫库。
 */
@Injectable()
export class DayArchiveScheduler {
  private readonly logger = new Logger(DayArchiveScheduler.name);

  constructor(
    @InjectRepository(FamilySettings)
    private readonly settings: Repository<FamilySettings>,
    private readonly students: StudentsService,
    private readonly tasks: TasksService,
  ) {}

  @Cron('20 0 * * *', { timeZone: 'Asia/Shanghai' })
  async tick() {
    const rows = await this.settings.find({
      where: { makeupEnabled: false },
      select: ['parentId'],
    });
    if (!rows.length) return;

    let archived = 0;
    for (const row of rows) {
      const sids = await this.students.getStudentIdsOfParent(row.parentId);
      for (const sid of sids) {
        try {
          const r = await this.tasks.archiveEndedPeriodsWhenNoMakeup(sid);
          archived += r.archived || 0;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`day-archive student=${sid}: ${msg}`);
        }
      }
    }
    if (archived > 0) {
      this.logger.log(`day-archive archived=${archived}`);
    }
  }
}
