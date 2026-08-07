import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  StudentDailyFocus,
  StudentWeeklyGoal,
} from '../entities/student-prefs.entity';
import { StudentWeeklyReview } from '../entities/student-weekly-review.entity';
import { JournalPost } from '../entities/journal.entity';
import { formatDate } from '../common/date-util';
import {
  isValidThemePreset,
  resolveThemeTitle,
} from '../common/theme-week';

/** ISO week key aligned with student web composable */
export function isoWeekKey(d = new Date()): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export type WeeklyGoalDto = {
  weekKey: string;
  text: string;
  themePreset: string;
  themeTitle: string;
};

@Injectable()
export class StudentPrefsService {
  constructor(
    @InjectRepository(StudentWeeklyGoal)
    private readonly weeklyGoals: Repository<StudentWeeklyGoal>,
    @InjectRepository(StudentDailyFocus)
    private readonly dailyFocus: Repository<StudentDailyFocus>,
    @InjectRepository(StudentWeeklyReview)
    private readonly weeklyReviews: Repository<StudentWeeklyReview>,
    @InjectRepository(JournalPost)
    private readonly journalPosts: Repository<JournalPost>,
  ) {}

  private toWeeklyGoalDto(
    week: string,
    row?: StudentWeeklyGoal | null,
  ): WeeklyGoalDto {
    return {
      weekKey: week,
      text: row?.text || '',
      themePreset: row?.themePreset || '',
      themeTitle: row?.themeTitle || '',
    };
  }

  async getWeeklyGoal(studentId: number, week = isoWeekKey()) {
    const row = await this.weeklyGoals.findOne({
      where: { studentId, weekKey: week },
    });
    return this.toWeeklyGoalDto(week, row);
  }

  /** 一次查出多名孩子本周主题（监控 / 仪式屏，避免 N+1） */
  async listWeeklyGoals(
    studentIds: number[],
    week = isoWeekKey(),
  ): Promise<Array<WeeklyGoalDto & { studentId: number }>> {
    if (!studentIds.length) return [];
    const rows = await this.weeklyGoals.find({
      where: { studentId: In(studentIds), weekKey: week },
    });
    const byId = new Map(rows.map((r) => [r.studentId, r]));
    return studentIds.map((studentId) => ({
      studentId,
      ...this.toWeeklyGoalDto(week, byId.get(studentId)),
    }));
  }

  /** 近几周主题史（作品集） */
  async listRecentWeeklyGoals(studentId: number, limit = 8) {
    const rows = await this.weeklyGoals.find({
      where: { studentId },
      order: { weekKey: 'DESC' },
      take: Math.max(1, Math.min(20, limit)),
    });
    return rows
      .filter((r) => r.themeTitle || r.themePreset || r.text)
      .map((r) => this.toWeeklyGoalDto(r.weekKey, r));
  }

  /** 多名孩子各自近几周有主题的记录（仪式屏，排除本周） */
  async listRecentThemesForStudents(
    studentIds: number[],
    excludeWeek = isoWeekKey(),
    perStudent = 2,
  ): Promise<
    Map<
      number,
      Array<{ weekKey: string; themeTitle: string; text: string }>
    >
  > {
    const out = new Map<
      number,
      Array<{ weekKey: string; themeTitle: string; text: string }>
    >();
    if (!studentIds.length) return out;
    for (const id of studentIds) out.set(id, []);
    const take = Math.max(1, Math.min(8, perStudent));
    const rows = await this.weeklyGoals.find({
      where: { studentId: In(studentIds) },
      order: { weekKey: 'DESC' },
      take: studentIds.length * (take + 4),
    });
    for (const r of rows) {
      if (r.weekKey === excludeWeek) continue;
      if (!(r.themeTitle || r.themePreset || r.text)) continue;
      const list = out.get(r.studentId) || [];
      if (list.length >= take) continue;
      const dto = this.toWeeklyGoalDto(r.weekKey, r);
      list.push({
        weekKey: dto.weekKey,
        themeTitle: dto.themeTitle || dto.text || '主题',
        text: dto.text || '',
      });
      out.set(r.studentId, list);
    }
    return out;
  }

  async putWeeklyGoal(
    studentId: number,
    body: {
      text?: string;
      themePreset?: string;
      themeTitle?: string;
    },
    week = isoWeekKey(),
  ) {
    const t =
      body.text !== undefined ? (body.text || '').trim().slice(0, 80) : undefined;
    const presetRaw =
      body.themePreset !== undefined
        ? (body.themePreset || '').trim().slice(0, 32)
        : undefined;
    if (presetRaw !== undefined && !isValidThemePreset(presetRaw)) {
      throw new BadRequestException('未知的主题周预设');
    }

    let row = await this.weeklyGoals.findOne({
      where: { studentId, weekKey: week },
    });
    if (!row) {
      row = this.weeklyGoals.create({
        studentId,
        weekKey: week,
        text: '',
        themePreset: '',
        themeTitle: '',
      });
    }
    if (t !== undefined) row.text = t;
    if (presetRaw !== undefined) {
      row.themePreset = presetRaw;
      if (presetRaw === '') {
        row.themeTitle = '';
      } else if (body.themeTitle !== undefined) {
        row.themeTitle = resolveThemeTitle(presetRaw, body.themeTitle);
      } else if (presetRaw !== 'custom') {
        row.themeTitle = resolveThemeTitle(presetRaw);
      } else if (!row.themeTitle) {
        row.themeTitle = resolveThemeTitle(presetRaw);
      }
    }
    if (body.themeTitle !== undefined && presetRaw === undefined) {
      row.themeTitle = resolveThemeTitle(
        row.themePreset || 'custom',
        body.themeTitle,
      );
    }
    await this.weeklyGoals.save(row);
    return this.toWeeklyGoalDto(week, row);
  }

  async getDailyFocus(studentId: number, day = formatDate()) {
    const row = await this.dailyFocus.findOne({
      where: { studentId, dayKey: day },
    });
    return {
      dayKey: day,
      keys: Array.isArray(row?.focusKeys) ? row!.focusKeys.map(String) : [],
      swaps: row?.swaps || 0,
    };
  }

  async putDailyFocus(
    studentId: number,
    keys: string[],
    swaps: number,
    day = formatDate(),
  ) {
    const focusKeys = keys.map(String).slice(0, 30);
    const safeSwaps = Math.max(0, Math.min(10, swaps || 0));
    let row = await this.dailyFocus.findOne({
      where: { studentId, dayKey: day },
    });
    if (!row) {
      row = this.dailyFocus.create({
        studentId,
        dayKey: day,
        focusKeys,
        swaps: safeSwaps,
      });
    } else {
      row.focusKeys = focusKeys;
      row.swaps = safeSwaps;
    }
    await this.dailyFocus.save(row);
    return { dayKey: day, keys: focusKeys, swaps: safeSwaps };
  }

  async getWeekendReview(studentId: number, week = isoWeekKey()) {
    const row = await this.weeklyReviews.findOne({
      where: { studentId, weekKey: week },
    });
    return {
      weekKey: week,
      proudText: row?.proudText || '',
      changeText: row?.changeText || '',
      promiseText: row?.promiseText || '',
      journalPostId: row?.journalPostId ?? null,
      journalPostSummary: row?.journalPostSummary || null,
    };
  }

  /** 一次查出多名孩子本周回顾（仪式屏等） */
  async listWeekendReviews(
    studentIds: number[],
    week = isoWeekKey(),
  ): Promise<
    Array<{
      studentId: number;
      weekKey: string;
      proudText: string;
      changeText: string;
      promiseText: string;
      journalPostId: number | null;
      journalPostSummary: string | null;
    }>
  > {
    if (!studentIds.length) return [];
    const rows = await this.weeklyReviews.find({
      where: { studentId: In(studentIds), weekKey: week },
    });
    const byId = new Map(rows.map((r) => [r.studentId, r]));
    return studentIds.map((studentId) => {
      const row = byId.get(studentId);
      return {
        studentId,
        weekKey: week,
        proudText: row?.proudText || '',
        changeText: row?.changeText || '',
        promiseText: row?.promiseText || '',
        journalPostId: row?.journalPostId ?? null,
        journalPostSummary: row?.journalPostSummary || null,
      };
    });
  }

  async putWeekendReview(
    studentId: number,
    body: {
      proudText?: string;
      changeText?: string;
      promiseText?: string;
      journalPostId?: number | null;
      journalPostSummary?: string | null;
    },
    week = isoWeekKey(),
  ) {
    const slice = (s: string | undefined) => (s || '').trim().slice(0, 120);
    let row = await this.weeklyReviews.findOne({
      where: { studentId, weekKey: week },
    });
    if (!row) {
      row = this.weeklyReviews.create({
        studentId,
        weekKey: week,
        journalPostId: null,
        journalPostSummary: null,
      });
    }
    if (body.proudText !== undefined) row.proudText = slice(body.proudText);
    if (body.changeText !== undefined) row.changeText = slice(body.changeText);
    if (body.promiseText !== undefined) row.promiseText = slice(body.promiseText);
    if (body.journalPostId !== undefined) {
      const pid =
        body.journalPostId == null || Number.isNaN(Number(body.journalPostId))
          ? null
          : Number(body.journalPostId);
      row.journalPostId = pid;
      if (pid == null) {
        row.journalPostSummary = null;
      } else if (body.journalPostSummary !== undefined) {
        row.journalPostSummary = slice(body.journalPostSummary || '') || null;
      } else {
        const post = await this.journalPosts.findOne({
          where: { id: pid, status: 'active' },
        });
        row.journalPostSummary = post
          ? slice(post.body || '（附图）') || '（附图）'
          : slice(body.journalPostSummary || '') || null;
      }
    } else if (body.journalPostSummary !== undefined) {
      row.journalPostSummary = slice(body.journalPostSummary || '') || null;
    }
    await this.weeklyReviews.save(row);
    return {
      weekKey: week,
      proudText: row.proudText,
      changeText: row.changeText,
      promiseText: row.promiseText,
      journalPostId: row.journalPostId ?? null,
      journalPostSummary: row.journalPostSummary || null,
    };
  }
}
