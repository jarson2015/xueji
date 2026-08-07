import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { CheckIn } from '../entities/checkin.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { PointPact } from '../entities/point-pact.entity';
import { User } from '../entities/user.entity';
import { StudentsService } from '../students/students.service';
import {
  ConfirmStatus,
  PointPactStatus,
  TaskCategory,
  TaskSchedule,
} from '../common/enums';
import { formatDate } from '../common/date-util';
import { isEqSourceTemplate } from '../task-lifecycle/lifecycle';
import {
  buildEmotionWordCloud,
  buildParentEncouragementHighlight,
} from './report-insights';
import { buildParentCoachInsights } from '../dashboard/parent-coach-insights';
import { ProgressExtrasService } from '../common/progress-extras.service';
import { FamilyService } from '../family/family.service';
import { FamilyPolicyReader } from '../family/family-policy.reader';
import { CheckinsService } from '../checkins/checkins.service';
import { TaskStreakService } from '../tasks/task-streak.service';
import { isPactOnTime } from '../pacts/pact-math';
import { StudentPrefsService } from '../students/student-prefs.service';
import { GrowthService } from '../growth/growth.service';

type DayKey = string;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(TaskAssign) private readonly assigns: Repository<TaskAssign>,
    @InjectRepository(PointLedger) private readonly ledgers: Repository<PointLedger>,
    @InjectRepository(PointPact) private readonly pacts: Repository<PointPact>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly students: StudentsService,
    private readonly extras: ProgressExtrasService,
    private readonly family: FamilyService,
    private readonly familyPolicy: FamilyPolicyReader,
    private readonly streaks: TaskStreakService,
    @Inject(forwardRef(() => CheckinsService))
    private readonly checkinSvc: CheckinsService,
    private readonly prefs: StudentPrefsService,
    private readonly growth: GrowthService,
  ) {}

  private last7Days(): DayKey[] {
    const days: DayKey[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(formatDate(d));
    }
    return days;
  }

  private sinceDate() {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    return since;
  }

  async weekly(userId: number, role: string, studentId?: number) {
    let ids: number[] = [];
    if (role === 'parent') {
      ids = await this.students.getStudentIdsOfParent(userId);
      if (studentId) {
        await this.students.assertBound(userId, studentId);
        ids = [studentId];
      }
    } else {
      ids = [userId];
    }

    const days = this.last7Days();
    const from = days[0];
    const to = days[days.length - 1];
    const empty = this.emptyReport(from, to);

    if (!ids.length) return empty;

    // Settle weekly_digest pending points when family uses that strategy
    const digestSettlements: { studentId: number; points: number; settled: number }[] =
      [];
    const policyMap = await this.familyPolicy.loadForStudents(ids);
    for (const sid of ids) {
      const edu = policyMap.get(sid)?.edu || {
        rewardMode: 'always',
        ageBand: 'general',
        reflectionEnabled: true,
      };
      if (edu.rewardMode === 'weekly_digest') {
        const s = await this.checkinSvc.settleWeeklyDigest(sid);
        if (s.points > 0) {
          digestSettlements.push({ studentId: sid, ...s });
        }
      }
    }

    const since = this.sinceDate();
    const students = await this.users.find({ where: { id: In(ids) } });
    const nameById = new Map(students.map((s) => [s.id, s.name]));

    const assigns = await this.assigns.find({
      where: { studentId: In(ids) },
      relations: ['task', 'student'],
    });
    const active = assigns.filter((a) => a.task?.active);

    const rows = await this.checkins.find({
      where: {
        studentId: In(ids),
        createdAt: MoreThanOrEqual(since),
      },
      relations: ['task', 'student'],
      order: { createdAt: 'DESC' },
    });

    const valid = rows.filter((r) =>
      [ConfirmStatus.NONE, ConfirmStatus.APPROVED].includes(
        r.confirmStatus as ConfirmStatus,
      ),
    );
    const pending = rows.filter(
      (r) => r.confirmStatus === ConfirmStatus.PENDING,
    );

    const restByStudent = this.familyPolicy.batchRestDayKeys(
      policyMap,
      ids,
      days,
    );

    // Points this week (needed for per-day breakdown below)
    const ledgers = await this.ledgers.find({
      where: {
        studentId: In(ids),
        createdAt: MoreThanOrEqual(since),
      },
    });

    // Daily heatmap + per-day detail for UI date switching
    const daily = days.map((date) => {
      const dayRows = valid.filter((r) => formatDate(r.createdAt) === date);
      const dayLedgers = ledgers.filter((l) => formatDate(l.createdAt) === date);
      const dayEarned = dayLedgers
        .filter((l) => l.delta > 0)
        .reduce((n, l) => n + l.delta, 0);
      const daySpent = dayLedgers
        .filter((l) => l.delta < 0)
        .reduce((n, l) => n + Math.abs(l.delta), 0);
      const restAll =
        ids.length > 0 &&
        ids.every((sid) => restByStudent.get(sid)?.get(date));
      const restAny = ids.some((sid) => restByStudent.get(sid)?.get(date));
      return {
        date,
        checkinCount: dayRows.length,
        isRestDay: ids.length === 1 ? !!restByStudent.get(ids[0])?.get(date) : restAll,
        isRestDayPartial: ids.length > 1 && restAny && !restAll,
        studentCount: new Set(dayRows.map((r) => r.studentId)).size,
        pointsEarned: dayEarned,
        pointsSpent: daySpent,
        items: dayRows.slice(0, 12).map((r) => ({
          id: r.id,
          title: r.task?.title || (r.planItemId ? '计划完成' : '打卡'),
          studentId: r.studentId,
          studentName: r.student?.name || nameById.get(r.studentId),
          note: r.note,
          reflectionText: this.extractReflection(r)?.answer || null,
          reflectionPrompt: this.extractReflection(r)?.prompt || null,
          parentLiked: !!r.parentLiked,
          parentComment: r.parentComment,
          confirmStatus: r.confirmStatus,
          at: r.createdAt,
        })),
      };
    });

    const checkinDays = daily.filter((d) => d.checkinCount > 0).map((d) => d.date);

    // Weekly completion: active assigns that had a valid checkin this week, or currently 100%
    const assignIdsWithCheckin = new Set(
      valid.filter((r) => r.assignId).map((r) => r.assignId as number),
    );
    const doneAssigns = active.filter(
      (a) => assignIdsWithCheckin.has(a.id) || a.progressPercent >= 100,
    );
    const due = active.length;
    const done = doneAssigns.length;
    const completionRate = due ? Math.round((done / due) * 100) : 0;

    // Category breakdown by checkin count
    const catCount: Record<string, number> = {
      [TaskCategory.STUDY]: 0,
      [TaskCategory.CHORE]: 0,
      [TaskCategory.ROUTINE]: 0,
    };
    for (const r of valid) {
      const cat = (r.task?.category as string) || TaskCategory.STUDY;
      catCount[cat] = (catCount[cat] || 0) + 1;
    }
    const byCategory = Object.entries(catCount).map(([category, count]) => ({
      category,
      count,
      label:
        category === TaskCategory.CHORE
          ? '家务'
          : category === TaskCategory.ROUTINE
            ? '习惯'
            : '学习',
    }));

    const eqRows = valid.filter((r) =>
      isEqSourceTemplate(r.task?.sourceTemplateId),
    );
    const eqMoments = {
      count: eqRows.length,
      message:
        eqRows.length > 0
          ? `本周有 ${eqRows.length} 次情商小练习（心情、感谢、倾听）`
          : '本周还没有情商小练习，可以从「说出今天的心情」开始',
      items: eqRows.slice(0, 8).map((r) => ({
        id: r.id,
        title: r.task?.title || '情商练习',
        studentName: r.student?.name || nameById.get(r.studentId),
        note: r.note,
        reflectionText: this.extractReflection(r)?.answer || null,
        at: r.createdAt,
      })),
    };

    let earned = 0;
    let spent = 0;
    for (const l of ledgers) {
      if (l.delta > 0) earned += l.delta;
      else spent += Math.abs(l.delta);
    }
    const balance =
      ids.length === 1
        ? students[0]?.pointsBalance ?? 0
        : students.reduce((s, u) => s + (u.pointsBalance || 0), 0);

    // Streak (max across selection)
    let streak = 0;
    const streakByStudent = new Map<number, number>();
    for (const id of ids) {
      const s = await this.extras.streak(id);
      streakByStudent.set(id, s);
      streak = Math.max(streak, s);
    }

    // Lagging: active without checkin this week and not complete
    const laggingTasks = active
      .filter((a) => !assignIdsWithCheckin.has(a.id) && a.progressPercent < 100)
      .sort((a, b) => a.progressPercent - b.progressPercent)
      .slice(0, 8)
      .map((a) => ({
        taskId: a.taskId,
        assignId: a.id,
        title: a.task.title,
        studentId: a.studentId,
        studentName: a.student?.name || nameById.get(a.studentId),
        progressPercent: a.progressPercent,
        category: a.task.category || TaskCategory.STUDY,
      }));

    // Highlights: top tasks by checkin count
    const taskHits = new Map<
      string,
      { title: string; studentId: number; studentName?: string; count: number }
    >();
    for (const r of valid) {
      if (!r.taskId) continue;
      const key = `${r.studentId}:${r.taskId}`;
      const cur = taskHits.get(key) || {
        title: r.task?.title || '打卡',
        studentId: r.studentId,
        studentName: r.student?.name || nameById.get(r.studentId),
        count: 0,
      };
      cur.count += 1;
      taskHits.set(key, cur);
    }
    const highlights = [...taskHits.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((h) => ({
        title: h.title,
        studentId: h.studentId,
        studentName: h.studentName,
        checkinCount: h.count,
        note: `本周打卡 ${h.count} 次`,
      }));

    if (streak > 0 && ids.length === 1) {
      highlights.unshift({
        title: '连续打卡',
        studentId: ids[0],
        studentName: nameById.get(ids[0]),
        checkinCount: streak,
        note: `已连续 ${streak} 天`,
      });
    }

    // nextWish for single student
    let nextWish: any = null;
    let weekTheme: any = null;
    let portfolioStats: {
      photoCount: number;
      milestoneCount: number;
      reflectionCount: number;
    } | null = null;
    let nearWishStats: {
      activeCount: number;
      redeemedThisWeek: number;
      pendingCount: number;
      nextTitle: string | null;
      message: string;
    } | null = null;
    if (ids.length === 1) {
      nextWish = await this.extras.nextWish(ids[0], students[0]?.pointsBalance);
      const [goal, portfolio, nearStats] = await Promise.all([
        this.prefs.getWeeklyGoal(ids[0]),
        this.growth.portfolio(ids[0]),
        this.extras.nearWishStats(ids[0], since),
      ]);
      weekTheme =
        goal.themeTitle || goal.themePreset || goal.text
          ? {
              themeTitle: goal.themeTitle,
              themePreset: goal.themePreset,
              text: goal.text,
              weekKey: goal.weekKey,
            }
          : null;
      portfolioStats = portfolio.stats;
      nearWishStats = nearStats;
    }

    // per-student breakdown when viewing all
    const perStudent =
      ids.length > 1
        ? await Promise.all(
            ids.map(async (sid) => {
              const sValid = valid.filter((r) => r.studentId === sid);
              const sDays = new Set(sValid.map((r) => formatDate(r.createdAt)));
              const sActive = active.filter((a) => a.studentId === sid);
              const sDone = sActive.filter(
                (a) =>
                  sValid.some((r) => r.assignId === a.id) ||
                  a.progressPercent >= 100,
              );
              const sLedgers = ledgers.filter((l) => l.studentId === sid);
              const sEarned = sLedgers
                .filter((l) => l.delta > 0)
                .reduce((n, l) => n + l.delta, 0);
              return {
                studentId: sid,
                name: nameById.get(sid) || '',
                completionRate: sActive.length
                  ? Math.round((sDone.length / sActive.length) * 100)
                  : 0,
                checkinDays: sDays.size,
                streak: streakByStudent.get(sid) || 0,
                pointsEarned: sEarned,
                pendingConfirms: pending.filter((p) => p.studentId === sid)
                  .length,
              };
            }),
          )
        : [];

    const headline = this.buildHeadline({
      completionRate,
      checkinDayCount: checkinDays.length,
      restDays: daily.filter((d) => d.isRestDay).length,
      lagging: laggingTasks.length,
      earned,
      pending: pending.length,
      multi: ids.length > 1,
    });

    const reflectionHighlight = this.pickReflectionHighlight(valid, nameById);
    const reflectionTexts = valid
      .map((r) => this.extractReflection(r)?.answer)
      .filter(Boolean) as string[];
    const emotionWordCloud = buildEmotionWordCloud(reflectionTexts);
    const parentEncouragement = buildParentEncouragementHighlight(
      rows
        .filter(
          (r) =>
            r.confirmStatus === ConfirmStatus.APPROVED &&
            (!!r.parentComment?.trim() || r.parentLiked),
        )
        .map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          studentId: r.studentId,
          studentName: r.student?.name || nameById.get(r.studentId),
          taskTitle: r.task?.title || (r.planItemId ? '计划完成' : '打卡'),
          parentComment: r.parentComment,
          parentLiked: r.parentLiked,
        })),
    );
    const keepsWord = await this.buildKeepsWord(ids, since, nameById);
    const habitStreaks = await this.buildHabitStreaks(ids, active, nameById);

    let moodTired = 0;
    let moodHard = 0;
    const slotStats = new Map<string, { done: number; total: number }>();
    for (const r of rows) {
      if (r.moodTag === 'tired') moodTired++;
      if (r.moodTag === 'hard') moodHard++;
      const slot = r.task?.timeSlot || 'anytime';
      const b = slotStats.get(slot) || { done: 0, total: 0 };
      b.total++;
      if (r.confirmStatus !== ConfirmStatus.REJECTED) b.done++;
      slotStats.set(slot, b);
    }
    const deferCount = active.filter(
      (a) => a.skipDate && a.skipDate >= from,
    ).length;
    const uniqueTaskIds = [...new Set(active.map((a) => a.taskId))];
    const confirmTasks = uniqueTaskIds.filter((tid) =>
      active.some((a) => a.taskId === tid && a.task?.requireConfirm),
    ).length;
    const confirmRate =
      uniqueTaskIds.length > 0 ? confirmTasks / uniqueTaskIds.length : 0;
    const coachInsights = buildParentCoachInsights({
      moodTiredCount: moodTired,
      moodHardCount: moodHard,
      deferCount,
      focusUsedCount: 0,
      confirmRate,
      slotDoneRates: [...slotStats.entries()].map(([slot, v]) => ({
        slot,
        rate: v.total > 0 ? v.done / v.total : 0,
      })),
      reflectionCount: reflectionTexts.length,
    });

    return {
      range: { from, to },
      headline,
      completionRate,
      completion: { due, done, rate: completionRate },
      streak,
      checkinDays,
      daily,
      byCategory,
      points: { earned, spent, net: earned - spent, balance },
      nextWish,
      weekTheme,
      portfolioStats,
      nearWishStats,
      highlights: highlights.slice(0, 5),
      laggingTasks,
      pendingConfirms: pending.length,
      perStudent,
      digestSettlements,
      reflectionHighlight,
      emotionWordCloud,
      parentEncouragement,
      coachInsights,
      keepsWord,
      habitStreaks,
      eqMoments,
    };
  }

  /** Prefer dedicated column; fall back to legacy `[反思]` in note */
  private extractReflection(r: CheckIn): {
    prompt: string | null;
    answer: string;
  } | null {
    if (r.reflectionText?.trim()) {
      return {
        prompt: r.reflectionPrompt?.trim() || null,
        answer: r.reflectionText.trim(),
      };
    }
    const note = r.note || '';
    const m = /\[反思\]\s*([\s\S]+)/.exec(note);
    if (!m?.[1]?.trim()) return null;
    return { prompt: null, answer: m[1].trim().slice(0, 500) };
  }

  private pickReflectionHighlight(
    valid: CheckIn[],
    nameById: Map<number, string>,
  ) {
    for (const r of valid) {
      const ref = this.extractReflection(r);
      if (!ref) continue;
      return {
        checkinId: r.id,
        date: formatDate(r.createdAt),
        taskTitle: r.task?.title || (r.planItemId ? '计划完成' : '打卡'),
        studentId: r.studentId,
        studentName: r.student?.name || nameById.get(r.studentId),
        prompt: ref.prompt,
        answer: ref.answer,
      };
    }
    return null;
  }

  /** 本周按时还回的积分约定次数（正向「说到做到」） */
  private async buildKeepsWord(
    ids: number[],
    since: Date,
    nameById: Map<number, string>,
  ) {
    const repaid = await this.pacts.find({
      where: {
        status: PointPactStatus.REPAID,
        repaidAt: MoreThanOrEqual(since),
        borrowerId: In(ids),
      },
      order: { repaidAt: 'DESC' },
    });
    const onTime = repaid.filter((p) => {
      if (!p.repaidAt) return false;
      return isPactOnTime(
        p.dueDate,
        p.overdueExtraPaid || 0,
        formatDate(p.repaidAt),
      );
    });
    const byStudent = ids.map((sid) => {
      const n = onTime.filter((p) => p.borrowerId === sid).length;
      return {
        studentId: sid,
        studentName: nameById.get(sid),
        count: n,
      };
    });
    const count = onTime.length;
    return {
      count,
      message:
        count > 0
          ? `说到做到 ${count} 次`
          : '本周还没有按时还回的约定，下次说到做到会记在这里',
      byStudent: ids.length > 1 ? byStudent.filter((s) => s.count > 0) : [],
    };
  }

  /** 家务/习惯连续天数（只展示正向，不排行羞辱） */
  private async buildHabitStreaks(
    ids: number[],
    active: TaskAssign[],
    nameById: Map<number, string>,
  ) {
    const life = active.filter(
      (a) =>
        a.task?.schedule === TaskSchedule.DAILY &&
        (a.task.category === TaskCategory.CHORE ||
          a.task.category === TaskCategory.ROUTINE),
    );
    const rows: {
      assignId: number;
      taskId: number;
      title: string;
      category: string;
      habitStreak: number;
      studentId: number;
      studentName?: string;
      note: string;
    }[] = [];
    for (const a of life) {
      const habitStreak = await this.streaks.streakForTask(
        a.studentId,
        a.taskId,
        a.task.category,
      );
      const rhythm = await this.streaks.rhythmForTask(a.studentId, a.taskId);
      if (habitStreak < 2 && rhythm.doneDays < 3) continue;
      const kind =
        a.task.category === TaskCategory.CHORE ? '家务' : '习惯';
      const note =
        rhythm.onTrack || rhythm.doneDays >= 3
          ? `${kind}最近 7 天完成了 ${rhythm.doneDays} 次`
          : `${kind}最近 ${habitStreak} 天有完成`;
      rows.push({
        assignId: a.id,
        taskId: a.taskId,
        title: a.task.title,
        category: a.task.category || TaskCategory.ROUTINE,
        habitStreak,
        studentId: a.studentId,
        studentName: a.student?.name || nameById.get(a.studentId),
        note,
      });
    }
    return rows.sort((a, b) => b.habitStreak - a.habitStreak).slice(0, 6);
  }

  private emptyReport(from: string, to: string) {
    return {
      range: { from, to },
      headline: '还没有孩子的数据，先去添加学生吧',
      completionRate: 0,
      completion: { due: 0, done: 0, rate: 0 },
      streak: 0,
      checkinDays: [] as string[],
      daily: [] as any[],
      byCategory: [] as any[],
      points: { earned: 0, spent: 0, net: 0, balance: 0 },
      nextWish: null,
      weekTheme: null,
      portfolioStats: null,
      nearWishStats: null,
      highlights: [] as any[],
      laggingTasks: [] as any[],
      pendingConfirms: 0,
      perStudent: [] as any[],
      reflectionHighlight: null as any,
      emotionWordCloud: [] as { word: string; count: number }[],
      parentEncouragement: null as any,
      keepsWord: {
        count: 0,
        message: '本周还没有按时还回的约定，下次说到做到会记在这里',
        byStudent: [] as any[],
      },
      habitStreaks: [] as any[],
      eqMoments: {
        count: 0,
        message: '本周还没有情商小练习，可以从「说出今天的心情」开始',
        items: [] as any[],
      },
    };
  }

  private buildHeadline(p: {
    completionRate: number;
    checkinDayCount: number;
    restDays: number;
    lagging: number;
    earned: number;
    pending: number;
    multi: boolean;
  }) {
    const who = p.multi ? '孩子们' : '本周';
    if (p.checkinDayCount === 0 && p.restDays < 7) {
      return `${who}还没有打卡记录，可以从一件小事开始`;
    }
    if (p.completionRate >= 80 && p.lagging === 0) {
      return `${who}节奏很稳，完成率 ${p.completionRate}%——先看见努力，积分只是脚注`;
    }
    if (p.pending > 0) {
      return `${who}有 ${p.pending} 条待确认，看完就能安心收工`;
    }
    if (p.lagging > 0) {
      return `${who}打卡 ${p.checkinDayCount} 天，还有 ${p.lagging} 件可以一起补一补`;
    }
    return `${who}打卡 ${p.checkinDayCount} 天，完成率 ${p.completionRate}%${p.earned ? `，+${p.earned} 分` : ''}`;
  }
}
