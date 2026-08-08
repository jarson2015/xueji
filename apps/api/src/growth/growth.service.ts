import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { GrowthMilestone } from '../entities/growth-milestone.entity';
import { CheckIn } from '../entities/checkin.entity';
import { StudentsService } from '../students/students.service';
import { StudentPrefsService } from '../students/student-prefs.service';
import { formatDate } from '../common/date-util';
import { ConfirmStatus } from '../common/enums';
import { HABIT_RHYTHM_TARGET } from '../common/habit-rhythm';

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(GrowthMilestone)
    private readonly milestones: Repository<GrowthMilestone>,
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    private readonly students: StudentsService,
    private readonly prefs: StudentPrefsService,
  ) {}

  async listForStudent(studentId: number, limit = 30) {
    return this.milestones.find({
      where: { studentId },
      order: { occurredAt: 'DESC' },
      take: limit,
    });
  }

  async listForParent(parentId: number, studentId?: number) {
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (!ids.length) return [];
    const target = studentId ?? ids[0];
    if (studentId) await this.students.assertBound(parentId, studentId);
    return this.listForStudent(target);
  }

  async addManual(
    parentId: number,
    studentId: number,
    title: string,
    note?: string,
  ) {
    await this.students.assertBound(parentId, studentId);
    const t = title.trim();
    if (!t) throw new BadRequestException('请填写里程碑标题');
    return this.milestones.save(
      this.milestones.create({
        studentId,
        title: t.slice(0, 120),
        note: note?.trim().slice(0, 200) || null,
        kind: 'manual',
        occurredAt: new Date(),
      }),
    );
  }

  /** 习惯节奏达 5/7 或连续 ≥7 天时自动记一条（同任务 7 天内不重复） */
  async maybeAutoMilestone(opts: {
    studentId: number;
    taskId: number;
    taskTitle: string;
    habitStreak: number;
    habitRhythmDone?: number;
    checkinId?: number;
  }) {
    const rhythmOk = (opts.habitRhythmDone ?? 0) >= HABIT_RHYTHM_TARGET;
    const streakOk = opts.habitStreak >= 7;
    if (!rhythmOk && !streakOk) return null;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const dup = await this.milestones.findOne({
      where: {
        studentId: opts.studentId,
        taskId: opts.taskId,
        kind: 'auto',
        occurredAt: MoreThanOrEqual(since),
      },
    });
    if (dup) return null;
    const note = rhythmOk
      ? `最近 7 天完成了 ${opts.habitRhythmDone} 次，节奏很稳`
      : `连续坚持 ${opts.habitStreak} 天，值得记一笔`;
    return this.milestones.save(
      this.milestones.create({
        studentId: opts.studentId,
        title: `「${opts.taskTitle}」节奏稳了`,
        note,
        kind: 'auto',
        taskId: opts.taskId,
        checkinId: opts.checkinId ?? null,
        occurredAt: new Date(),
      }),
    );
  }

  async album(studentId: number, days = 90) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await this.checkins.find({
      where: {
        studentId,
        createdAt: MoreThanOrEqual(since),
      },
      relations: ['task'],
      order: { createdAt: 'DESC' },
    });
    const withImage = rows.filter(
      (r) =>
        r.imageUrl &&
        [ConfirmStatus.NONE, ConfirmStatus.APPROVED].includes(
          r.confirmStatus as ConfirmStatus,
        ),
    );
    const byMonth = new Map<
      string,
      { month: string; items: { id: number; imageUrl: string; title: string; date: string }[] }
    >();
    for (const r of withImage) {
      const month = formatDate(r.createdAt).slice(0, 7);
      const bucket = byMonth.get(month) || { month, items: [] };
      bucket.items.push({
        id: r.id,
        imageUrl: r.imageUrl!,
        title: r.task?.title || '打卡',
        date: formatDate(r.createdAt),
      });
      byMonth.set(month, bucket);
    }
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
  }

  /** 周报只用计数，避免嵌完整 album/portfolio */
  async portfolioStats(studentId: number): Promise<{
    photoCount: number;
    milestoneCount: number;
    reflectionCount: number;
  }> {
    const sincePhoto = new Date();
    sincePhoto.setDate(sincePhoto.getDate() - 90);
    const sinceReflect = new Date();
    sinceReflect.setDate(sinceReflect.getDate() - 14);
    const [photoRaw, milestoneCount, reflectRows] = await Promise.all([
      this.checkins.count({
        where: {
          studentId,
          createdAt: MoreThanOrEqual(sincePhoto),
          confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
          imageUrl: Not(IsNull()),
        },
      }),
      this.milestones.count({ where: { studentId } }),
      this.checkins.find({
        where: {
          studentId,
          createdAt: MoreThanOrEqual(sinceReflect),
          confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
        },
        select: ['id', 'reflectionText', 'moodTag'],
        order: { createdAt: 'DESC' },
        take: 40,
      }),
    ]);
    const reflectionCount = reflectRows.filter(
      (r) =>
        (r.reflectionText && r.reflectionText.trim()) ||
        (r.moodTag && r.moodTag.trim()),
    ).length;
    return {
      photoCount: Math.min(photoRaw, 30),
      milestoneCount: Math.min(milestoneCount, 30),
      reflectionCount: Math.min(reflectionCount, 12),
    };
  }

  /** 作品集：主题周 + 里程碑 + 照片 + 近期反思（不新建表） */
  async portfolio(studentId: number) {
    const sinceReflect = new Date();
    sinceReflect.setDate(sinceReflect.getDate() - 14);
    const [weekTheme, themeHistory, milestones, album, reflectRows] =
      await Promise.all([
        this.prefs.getWeeklyGoal(studentId),
        this.prefs.listRecentWeeklyGoals(studentId, 8),
        this.listForStudent(studentId, 30),
        this.album(studentId, 90),
        this.checkins.find({
          where: {
            studentId,
            createdAt: MoreThanOrEqual(sinceReflect),
            confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
          },
          relations: ['task'],
          order: { createdAt: 'DESC' },
          take: 40,
        }),
      ]);
    const photos = album.flatMap((g) => g.items).slice(0, 30);
    const reflections = reflectRows
      .filter(
        (r) =>
          (r.reflectionText && r.reflectionText.trim()) ||
          (r.moodTag && r.moodTag.trim()),
      )
      .slice(0, 12)
      .map((r) => ({
        id: r.id,
        title: r.task?.title || '打卡',
        text: (r.reflectionText || '').trim().slice(0, 120),
        moodTag: r.moodTag || null,
        at: r.createdAt,
        date: formatDate(r.createdAt),
      }));
    const theme =
      weekTheme.themeTitle || weekTheme.themePreset || weekTheme.text
        ? {
            themeTitle: weekTheme.themeTitle,
            themePreset: weekTheme.themePreset,
            text: weekTheme.text,
            weekKey: weekTheme.weekKey,
          }
        : null;
    const history = themeHistory
      .filter((h) => h.weekKey !== weekTheme.weekKey)
      .map((h) => ({
        weekKey: h.weekKey,
        themeTitle: h.themeTitle,
        themePreset: h.themePreset,
        text: h.text,
      }));
    return {
      weekTheme: theme,
      themeHistory: history,
      milestones,
      photos,
      reflections,
      stats: {
        photoCount: photos.length,
        milestoneCount: milestones.length,
        reflectionCount: reflections.length,
      },
    };
  }

  /** 近端愿望兑现：记一条成长里程碑（7 天内同愿望去重） */
  async recordNearWishRedeemed(studentId: number, wishTitle: string) {
    const title = `兑现了近端愿望「${(wishTitle || '小愿望').trim().slice(0, 40)}」`;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const dup = await this.milestones.findOne({
      where: {
        studentId,
        kind: 'auto',
        title,
        occurredAt: MoreThanOrEqual(since),
      },
    });
    if (dup) return dup;
    return this.milestones.save(
      this.milestones.create({
        studentId,
        title: title.slice(0, 120),
        note: '近端愿望说到做到，值得留在作品集里',
        kind: 'auto',
        occurredAt: new Date(),
      }),
    );
  }
}
