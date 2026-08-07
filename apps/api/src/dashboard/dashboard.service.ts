import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { TaskAssign } from '../entities/task-assign.entity';
import { CheckIn } from '../entities/checkin.entity';
import { User } from '../entities/user.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { PointGift } from '../entities/point-gift.entity';
import { StudentsService } from '../students/students.service';
import { TasksService } from '../tasks/tasks.service';
import { PlansService } from '../plans/plans.service';
import { FamilyService } from '../family/family.service';
import { CheckinPolicyReader } from '../family/checkin-policy.reader';
import { PactsService } from '../pacts/pacts.service';
import { ConfirmStatus, RedeemStatus, PointGiftStatus } from '../common/enums';
import { ProgressExtrasService } from '../common/progress-extras.service';
import { formatDate } from '../common/date-util';
import { StudentPrefsService } from '../students/student-prefs.service';
import {
  showsOnRestDay,
  type RestPausePolicy,
} from '../common/rest-day-policy';
import {
  pickReflectionPrompt,
  shouldAutoSettleWeeklyDigest,
  resolveRewardFadeHint,
} from '../task-lifecycle/lifecycle';
import { PointsLedgerService } from '../points/points-ledger.service';
import { buildFairnessHint } from '../task-lifecycle/rotate-fairness';
import { buildParentOverloadHint } from '../common/edu-policy-math';
import { buildParentCoachInsights } from './parent-coach-insights';
import { buildRepairMessage } from '../common/mood-policy';
import {
  bumpCategory,
  buildChildTimeline,
  computeStuckStep,
  emptyByCategory,
  isTaskDueToday,
  resolvePlanStatus,
  resolveTaskStatus,
  sortMonitorItems,
  type MonitorTodayItem,
} from './monitor.helpers';

/** Pending redeem older than this many days → soft hint for parent */
const REDEEM_OVERDUE_DAYS = 3;
/** Same-direction gifts in 14 days before soft fairness hint */
const GIFT_PAIR_HINT_THRESHOLD = 3;

function pauseFromRest(rest: {
  pauseAll?: boolean;
  pauseCategories?: string[];
}): RestPausePolicy {
  return {
    pauseAll: !!rest.pauseAll,
    pauseCategories: rest.pauseCategories?.length
      ? rest.pauseCategories
      : ['study'],
  };
}

function makeupHintForCategory(category?: string | null) {
  if (category === 'chore' || category === 'routine') {
    return '把节奏找回来：补上进度是收尾，不是惩罚';
  }
  return '把事情收尾：补上进度拿部分积分，需家长看一眼';
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(TaskAssign) private readonly assigns: Repository<TaskAssign>,
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(WishRedeem)
    private readonly redeems: Repository<WishRedeem>,
    @InjectRepository(PointGift)
    private readonly gifts: Repository<PointGift>,
    private readonly students: StudentsService,
    private readonly tasks: TasksService,
    private readonly plans: PlansService,
    private readonly extras: ProgressExtrasService,
    private readonly family: FamilyService,
    private readonly checkinPolicy: CheckinPolicyReader,
    private readonly pacts: PactsService,
    private readonly ledger: PointsLedgerService,
    private readonly prefs: StudentPrefsService,
  ) {}

  async progress(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    const students = studentIds.length
      ? await this.users.find({ where: { id: In(studentIds) } })
      : [];
    if (!studentIds.length) {
      return { students: [], recent: [] };
    }

    const allAssigns = await this.assigns.find({
      where: { studentId: In(studentIds) },
      relations: ['task', 'task.steps'],
    });
    const allPending = await this.checkins.find({
      where: {
        studentId: In(studentIds),
        confirmStatus: ConfirmStatus.PENDING,
      },
    });
    const pendingCount = new Map<number, number>();
    for (const p of allPending) {
      pendingCount.set(p.studentId, (pendingCount.get(p.studentId) || 0) + 1);
    }

    const result: any[] = [];
    for (const s of students) {
      const assigns = allAssigns.filter((a) => a.studentId === s.id);
      const items = assigns
        .filter((a) => a.task?.active)
        .map((a) => {
          const n = this.tasks.normalizeAssign(a);
          const steps = n.steps || [];
          return {
            ...n,
            stuckStep:
              steps.length && n.progressPercent < 100
                ? steps[
                    Math.min(
                      steps.length - 1,
                      Math.floor((n.progressPercent / 100) * steps.length),
                    )
                  ]
                : null,
          };
        });
      result.push({
        student: {
          id: s.id,
          name: s.name,
          pointsBalance: s.pointsBalance,
        },
        tasks: items,
        pendingConfirms: pendingCount.get(s.id) || 0,
        completionRate: items.length
          ? Math.round(
              (items.filter((i) => i.progressPercent >= 100).length / items.length) *
                100,
            )
          : 0,
      });
    }

    const recent = await this.checkins.find({
      where: { studentId: In(studentIds) },
      relations: ['student', 'task'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return { students: result, recent };
  }

  async today(studentId: number) {
    return this.buildToday(studentId, { lite: false });
  }

  /** Soft-refresh path: no digest settlement side-effect, no encouragement query */
  async todayLite(studentId: number) {
    return this.buildToday(studentId, { lite: true });
  }

  private async latestRepairFor(studentId: number) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rejected = await this.checkins.find({
      where: {
        studentId,
        confirmStatus: ConfirmStatus.REJECTED,
      },
      relations: ['task'],
      order: { id: 'DESC' },
      take: 5,
    });
    const row = rejected.find(
      (r) =>
        r.createdAt &&
        new Date(r.createdAt).getTime() >= since.getTime() &&
        !!r.parentComment?.trim(),
    );
    if (!row) return null;
    const comment = row.parentComment!.trim();
    return {
      fromLabel: '家长想和你再商量',
      message: buildRepairMessage(comment),
      taskTitle: row.task?.title || '打卡',
      at: new Date(row.createdAt).toISOString(),
    };
  }

  private async latestEncouragementFor(studentId: number) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentApproved = await this.checkins.find({
      where: {
        studentId,
        confirmStatus: ConfirmStatus.APPROVED,
      },
      order: { id: 'DESC' },
      take: 10,
    });
    const encourageRow = recentApproved.find(
      (r) =>
        (r.parentLiked || !!r.parentComment?.trim()) &&
        r.createdAt &&
        new Date(r.createdAt).getTime() >= since.getTime(),
    );
    if (!encourageRow) return null;
    const comment = encourageRow.parentComment?.trim();
    return {
      fromLabel: encourageRow.parentLiked ? '家长为你点赞' : '家长说',
      message: comment
        ? comment
        : encourageRow.parentLiked
          ? '认真完成的样子，家长看见了'
          : '家长已通过你的完成记录',
      at: new Date(encourageRow.createdAt).toISOString(),
    };
  }

  private async buildToday(studentId: number, opts: { lite: boolean }) {
    const policy = await this.checkinPolicy.forStudent(studentId);
    let digestSettlement: { points: number; settled: number } | null = null;
    if (
      !opts.lite &&
      policy.edu.rewardMode === 'weekly_digest' &&
      shouldAutoSettleWeeklyDigest()
    ) {
      digestSettlement = await this.ledger.settleWeeklyDigest(studentId);
      if (!digestSettlement.points) digestSettlement = null;
    }
    const isRestDay = this.family.isRestDay(policy.rest);
    const pause = pauseFromRest(policy.rest);
    const makeupCfg = policy.makeup;

    const [covenant, tasks, planItems, user, streak, pactHints] =
      await Promise.all([
        this.family.covenantForStudent(studentId),
        this.tasks.myTasks(studentId, makeupCfg.enabled),
        this.plans.todayItems(studentId),
        this.users.findOne({ where: { id: studentId } }),
        this.extras.streak(studentId),
        this.pacts.hintsForStudent(studentId),
      ]);

    const makeupHints = makeupCfg.enabled
      ? tasks.filter((t) => t.canMakeup)
      : [];
    let todayTasks = tasks.filter((t) => {
      if (t.deferredToday) return false;
      if (t.isExpired) return false;
      if (t.sharedDone || t.status === 'shared_done') return false;
      if (t.dayArchived || t.status === 'day_archived') return false;
      if (t.rotateSkipToday) return false;
      if (t.schedule === 'once') return t.status !== 'completed';
      return true;
    });
    if (isRestDay) {
      todayTasks = todayTasks.filter((t) => showsOnRestDay(t, pause));
    }
    const deferredToday = tasks.filter((t) => t.deferredToday);
    const softMissed = makeupCfg.enabled
      ? tasks.filter(
          (t) =>
            !t.isExpired &&
            t.schedule !== 'once' &&
            t.canMakeup &&
            t.makeupPeriodKey,
        )
      : [];
    const softToday = todayTasks.filter(
      (t) => t.schedule !== 'once' && t.progressPercent < 100,
    );
    const sharedDoneToday = tasks.filter((t) => t.sharedDone);

    const nextWishPromise = this.extras.nextWish(
      studentId,
      user?.pointsBalance ?? 0,
    );
    let nextWish: Awaited<ReturnType<typeof this.extras.nextWish>>;
    let latestEncouragement: Awaited<
      ReturnType<DashboardService['latestEncouragementFor']>
    > | null = null;
    let latestRepair: Awaited<
      ReturnType<DashboardService['latestRepairFor']>
    > | null = null;
    if (opts.lite) {
      nextWish = await nextWishPromise;
    } else {
      const pair = await Promise.all([
        nextWishPromise,
        this.latestEncouragementFor(studentId),
        this.latestRepairFor(studentId),
      ]);
      nextWish = pair[0];
      latestEncouragement = pair[1];
      latestRepair = pair[2];
    }

    let softNudge: { message: string; count: number; kind: string } | null =
      null;
    const nudgeMissed = isRestDay
      ? softMissed.filter((t) => showsOnRestDay(t, pause))
      : softMissed;
    const nudgeToday = softToday;
    const pactActionCount =
      pactHints.overdue +
      pactHints.awaitMyAccept +
      pactHints.awaitParent +
      pactHints.dueSoon;
    const restHint = pause.pauseAll
      ? '今天是家庭休息日，任务先不催你；想做也可以自愿做'
      : '今天是家庭休息日，约定暂停的任务先不催你';
    if (nudgeMissed.length) {
      const habitHeavy = nudgeMissed.every(
        (t) => t.category === 'chore' || t.category === 'routine',
      );
      softNudge = {
        kind: 'makeup',
        message: isRestDay
          ? `${restHint}；还有 ${nudgeMissed.length} 件上一期没收尾，想补可以申请「补上进度」`
          : habitHeavy
            ? `有 ${nudgeMissed.length} 件习惯/家务上一期没收尾——把节奏找回来，可以申请「补上进度」`
            : `有 ${nudgeMissed.length} 件上一期还没收尾——把事情收尾，可以申请「补上进度」`,
        count: nudgeMissed.length,
      };
    } else if (pactHints.summary) {
      softNudge = {
        kind: 'pact',
        message: pactHints.summary,
        count: pactActionCount || 1,
      };
    } else if (nudgeToday.length) {
      softNudge = {
        kind: 'today',
        message: isRestDay
          ? `${restHint}；想做的话，先做好眼前这一件就很好`
          : '先做好眼前这一件就很好，后面的到点再看',
        count: nudgeToday.length,
      };
    }
    const edu = policy.edu;
    const daySalt =
      studentId * 1000 +
      Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

    const payload: Record<string, unknown> = {
      lite: opts.lite,
      tasks: todayTasks,
      deferredToday,
      planItems,
      streak,
      nextWish,
      pointsBalance: user?.pointsBalance ?? 0,
      isRestDay,
      restPauseAll: pause.pauseAll,
      restPauseCategories: pause.pauseCategories,
      dailySkipLimit: covenant.dailySkipLimit ?? 1,
      skipsUsedToday: deferredToday.length,
      digestSettlement: opts.lite ? null : digestSettlement,
      makeupEnabled: makeupCfg.enabled,
      makeupDiscountPercent: makeupCfg.discountPercent,
      makeupHints: makeupHints.map((t) => ({
        assignId: t.assignId,
        title: t.title,
        schedule: t.schedule,
        category: t.category,
        hint: makeupHintForCategory(t.category),
        isExpired: t.isExpired,
        makeupPeriodKey: t.makeupPeriodKey,
        pointsReward: t.pointsReward,
        makeupPoints: Math.floor(
          (t.pointsReward * makeupCfg.discountPercent) / 100,
        ),
      })),
      softNudge,
      sharedDoneHints: sharedDoneToday.slice(0, 3).map((t) => ({
        assignId: t.assignId,
        title: t.title,
        message: '已有家人完成，你今天可以先歇一歇',
      })),
      rotateHints: tasks
        .filter(
          (t) =>
            t.rotateEnabled &&
            !t.sharedDone &&
            t.progressPercent < 100 &&
            !t.isExpired,
        )
        .slice(0, 3)
        .map((t) => ({
          assignId: t.assignId,
          title: t.title,
          isDuty: !!t.isRotateDuty,
          dutyName: t.rotateDutyName || null,
          message: t.isRotateDuty
            ? `今天这件家务由你主责：${t.title}（其他人可以歇或帮忙）`
            : `今天「${t.title}」由${t.rotateDutyName || '家人'}主责；你可以先歇一歇，也可以自愿帮忙`,
        })),
      pactHints,
      ...edu,
      slotExtendedEnabled: policy.slots.extendedEnabled,
      slotClockMap: policy.slots.clockMap,
      slotClockEffective: policy.slots.clockEffective,
      reflectionPrompt: edu.reflectionEnabled
        ? pickReflectionPrompt(edu.ageBand || 'general', daySalt)
        : null,
    };
    if (!opts.lite) {
      payload.latestEncouragement = latestEncouragement ?? null;
      payload.latestRepair = latestRepair ?? null;
    }
    return payload;
  }

  async summary(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    const students = studentIds.length
      ? await this.users.find({ where: { id: In(studentIds) } })
      : [];
    const today = formatDate();
    const children: any[] = [];
    let totalDue = 0;
    let totalDone = 0;
    const firstUndone: string[] = [];

    const [restConfigs, tasksByStudent, plansByStudent] = studentIds.length
      ? await Promise.all([
          this.family.restConfigsForStudents(studentIds),
          this.tasks.myTasksForStudents(studentIds),
          this.plans.todayItemsForStudents(studentIds),
        ])
      : [
          new Map<number, any>(),
          new Map<number, any[]>(),
          new Map<number, any[]>(),
        ];

    for (const s of students) {
      const rest = restConfigs.get(s.id);
      const isRestDay = rest ? this.family.isRestDay(rest) : false;
      const pause = pauseFromRest(rest || {});
      const tasks = tasksByStudent.get(s.id) || [];
      const planItems = plansByStudent.get(s.id) || [];
      const taskTodos = tasks
        .filter((t) => {
          if (t.deferredToday) return false;
          if (t.isExpired) return false;
          if (t.sharedDone || t.status === 'shared_done') return false;
          if (t.dayArchived || t.status === 'day_archived') return false;
          if (t.rotateSkipToday) return false;
          if (isRestDay && !showsOnRestDay(t, pause)) return false;
          return true;
        })
        .map((t) => ({
          title: t.title,
          done: t.progressPercent >= 100,
          category: t.category,
        }));
      const planTodos = planItems.map((p: any) => ({
        title: p.title,
        done: !!p.done,
      }));
      const todos = [...taskTodos, ...planTodos];
      const due = todos.length;
      const done = todos.filter((t) => t.done).length;
      const unfinished = todos
        .filter((t) => !t.done)
        .map((t) => t.title)
        .slice(0, 5);
      totalDue += due;
      totalDone += done;
      if (unfinished[0]) {
        firstUndone.push(`${s.name}还可以一起完成：${unfinished[0]}`);
      }
      children.push({
        studentId: s.id,
        name: s.name,
        pointsBalance: s.pointsBalance,
        due,
        done,
        unfinishedTitles: unfinished,
        isRestDay,
      });
    }

    const pendingConfirms = studentIds.length
      ? await this.checkins.find({
          where: {
            studentId: In(studentIds),
            confirmStatus: ConfirmStatus.PENDING,
          },
          relations: ['student', 'task'],
          order: { createdAt: 'DESC' },
          take: 20,
        })
      : [];

    const pendingList = pendingConfirms.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      studentName: c.student?.name,
      taskTitle: c.task?.title || '计划完成',
      note: c.note,
      imageUrl: c.imageUrl,
      createdAt: c.createdAt,
      isMakeup: !!c.isMakeup,
      makeupPeriodKey: c.makeupPeriodKey,
    }));

    let headline = `今天完成 ${totalDone}/${totalDue || 0}`;
    if (children.every((c) => c.isRestDay) && children.length) {
      headline = totalDue
        ? `今天是家庭休息日，约定任务先不催 · 完成 ${totalDone}/${totalDue}`
        : '今天是家庭休息日，约定任务先不催';
    } else if (!totalDue) headline = '今天还没有安排任务';
    else if (firstUndone[0]) headline = `${headline}，${firstUndone[0]}`;
    else headline = `${headline}，都很棒`;

    const pactAlert = await this.pacts.alertForParent(parentId);
    if (pactAlert.total) {
      const bits: string[] = [];
      if (pactAlert.parentPending) {
        bits.push(`${pactAlert.parentPending} 份待家长同意`);
      }
      if (pactAlert.overdue) {
        bits.push(`${pactAlert.overdue} 份已过还回日`);
      }
      headline = `${headline} · 积分约定：${bits.join('、')}`;
    }

    const settings = await this.family.getOrCreate(parentId);
    const streakByStudent = await this.extras.streaksForStudents(studentIds);
    let maxStreak = 0;
    for (const sid of studentIds) {
      maxStreak = Math.max(maxStreak, streakByStudent.get(sid) || 0);
    }
    const rewardFadeHint = resolveRewardFadeHint(
      settings.rewardMode || 'always',
      settings.createdAt,
      { streak: maxStreak },
    );

    const [
      fairnessHint,
      overdueRedeemHint,
      giftFairnessHint,
      taskStats,
    ] = await Promise.all([
      this.buildSharedFairnessHint(studentIds, students),
      this.buildOverdueRedeemHint(studentIds),
      this.buildGiftFairnessHint(studentIds, students),
      this.tasks.taskActivityStatsForParent(parentId),
    ]);
    const parentOverloadHint = this.computeParentOverloadHint(
      children,
      pendingList.length,
      taskStats,
    );

    return {
      date: today,
      headline,
      totalDue,
      totalDone,
      children,
      pendingConfirms: pendingList,
      pactAlert,
      rewardFadeHint,
      fairnessHint,
      overdueRedeemHint,
      giftFairnessHint,
      parentOverloadHint,
      rewardMode: settings.rewardMode || 'always',
    };
  }

  /** Parent monitor: per-child today tasks + timeline in one read model */
  async monitor(
    parentId: number,
    opts: { lite?: boolean; timing?: boolean } = {},
  ) {
    const lite = !!opts.lite;
    const timing = !!opts.timing;
    const t0 = timing ? performance.now() : 0;
    const marks: Record<string, number> = {};
    const mark = (k: string) => {
      if (timing) marks[k] = +(performance.now() - t0).toFixed(1);
    };

    const students = await this.students.listStudentUsersForParent(parentId);
    mark('users');
    const studentIds = students.map((s) => s.id);
    mark('ids');
    const today = formatDate();
    const dayStart = new Date(`${today}T00:00:00+08:00`);

    const [restConfigs, tasksByStudent, plansByStudent, streakByStudent, pendingRows, todayCheckins, todayRedeems] =
      studentIds.length
        ? await Promise.all([
            this.family.restConfigsForStudents(studentIds),
            this.tasks.myTasksForStudents(studentIds),
            this.plans.todayItemsForStudents(studentIds),
            lite
              ? Promise.resolve(new Map<number, number>())
              : this.extras.streaksForStudents(studentIds),
            this.checkins.find({
              where: {
                studentId: In(studentIds),
                confirmStatus: ConfirmStatus.PENDING,
              },
              relations: ['student', 'task'],
              order: { createdAt: 'DESC' },
            }),
            lite
              ? Promise.resolve([] as CheckIn[])
              : this.checkins.find({
                  where: {
                    studentId: In(studentIds),
                    createdAt: MoreThanOrEqual(dayStart),
                  },
                  relations: ['student', 'task'],
                  order: { createdAt: 'DESC' },
                  take: 80,
                }),
            lite
              ? Promise.resolve([] as WishRedeem[])
              : this.redeems.find({
                  where: {
                    studentId: In(studentIds),
                    createdAt: MoreThanOrEqual(dayStart),
                  },
                  relations: ['wish', 'student'],
                  order: { createdAt: 'DESC' },
                  take: 40,
                }),
          ])
        : [
            new Map<number, any>(),
            new Map<number, any[]>(),
            new Map<number, any[]>(),
            new Map<number, number>(),
            [] as CheckIn[],
            [] as CheckIn[],
            [] as WishRedeem[],
          ];
    mark('core');

    const [weeklyGoals, nextWishByStudent] = studentIds.length
      ? await Promise.all([
          this.prefs.listWeeklyGoals(studentIds),
          lite
            ? Promise.resolve(
                new Map<
                  number,
                  Awaited<ReturnType<ProgressExtrasService['nextWish']>>
                >(),
              )
            : this.extras.nextWishesForStudents(
                studentIds,
                new Map(students.map((s) => [s.id, s.pointsBalance ?? 0])),
              ),
        ])
      : [
          [] as Awaited<ReturnType<StudentPrefsService['listWeeklyGoals']>>,
          new Map<
            number,
            Awaited<ReturnType<ProgressExtrasService['nextWish']>>
          >(),
        ];
    const weekThemeById = new Map(
      weeklyGoals.map((g) => [
        g.studentId,
        g.themeTitle || g.themePreset || g.text
          ? {
              themeTitle: g.themeTitle,
              themePreset: g.themePreset,
              text: g.text,
              weekKey: g.weekKey,
            }
          : null,
      ]),
    );

    const pendingByAssign = new Map<number, { id: number; at: Date }>();
    const pendingByPlanItem = new Map<number, { id: number; at: Date }>();
    const pendingCountByStudent = new Map<number, number>();
    for (const row of pendingRows as CheckIn[]) {
      pendingCountByStudent.set(
        row.studentId,
        (pendingCountByStudent.get(row.studentId) || 0) + 1,
      );
      if (row.assignId && !pendingByAssign.has(row.assignId)) {
        pendingByAssign.set(row.assignId, { id: row.id, at: row.createdAt });
      }
      if (row.planItemId && !pendingByPlanItem.has(row.planItemId)) {
        pendingByPlanItem.set(row.planItemId, { id: row.id, at: row.createdAt });
      }
    }

    const activityByAssign = new Map<number, Date>();
    const activityByPlanItem = new Map<number, Date>();
    for (const row of todayCheckins as CheckIn[]) {
      if (row.assignId) {
        const prev = activityByAssign.get(row.assignId);
        if (!prev || row.createdAt > prev) activityByAssign.set(row.assignId, row.createdAt);
      }
      if (row.planItemId) {
        const prev = activityByPlanItem.get(row.planItemId);
        if (!prev || row.createdAt > prev) {
          activityByPlanItem.set(row.planItemId, row.createdAt);
        }
      }
    }

    let totalDue = 0;
    let totalDone = 0;
    const firstUndone: string[] = [];
    const children: any[] = [];

    for (const s of students) {
      const rest = restConfigs.get(s.id);
      const isRestDay = rest ? this.family.isRestDay(rest) : false;
      const pause = pauseFromRest(rest || {});
      const tasks = tasksByStudent.get(s.id) || [];
      const planItems = plansByStudent.get(s.id) || [];

      const todayTasks: MonitorTodayItem[] = [];
      const byCategory = emptyByCategory();

      for (const t of tasks) {
        if (!isTaskDueToday(t, isRestDay, pause)) continue;
        const pending = pendingByAssign.get(t.assignId);
        const status = resolveTaskStatus(t, pending?.id);
        const isDone = t.progressPercent >= 100;
        bumpCategory(byCategory, t.category, isDone);
        const activity = pending?.at || activityByAssign.get(t.assignId);
        todayTasks.push({
          kind: 'task',
          id: t.assignId,
          title: t.title,
          category: t.category || 'study',
          progressPercent: t.progressPercent,
          status,
          schedule: t.schedule,
          requireConfirm: t.requireConfirm,
          isRotateDuty: t.isRotateDuty,
          rotateDutyName: t.rotateDutyName,
          updatedAt: activity ? new Date(activity).toISOString() : undefined,
          pendingCheckinId: pending?.id ?? null,
          ...(lite
            ? {}
            : {
                stuckStep: computeStuckStep(t.steps, t.progressPercent),
              }),
        });
      }

      for (const p of planItems) {
        const pending = pendingByPlanItem.get(p.planItemId);
        const status = resolvePlanStatus(!!p.done, pending?.id);
        bumpCategory(byCategory, 'study', !!p.done);
        const activity = pending?.at || activityByPlanItem.get(p.planItemId);
        todayTasks.push({
          kind: 'plan',
          id: p.planItemId,
          title: p.title,
          category: 'study',
          progressPercent: p.done ? 100 : 0,
          status,
          updatedAt: activity ? new Date(activity).toISOString() : undefined,
          pendingCheckinId: pending?.id ?? null,
        });
      }

      const deferredToday: MonitorTodayItem[] = lite
        ? []
        : tasks
            .filter((t) => t.deferredToday)
            .map((t) => ({
              kind: 'task' as const,
              id: t.assignId,
              title: t.title,
              category: t.category || 'study',
              progressPercent: t.progressPercent,
              status: 'deferred' as const,
              schedule: t.schedule,
              requireConfirm: t.requireConfirm,
            }));

      const sortedTasks = sortMonitorItems(todayTasks);
      const due = sortedTasks.length;
      const done = sortedTasks.filter((x) => x.status === 'done').length;
      totalDue += due;
      totalDone += done;

      const unfinished = sortedTasks
        .filter((x) => x.status !== 'done')
        .map((x) => x.title)
        .slice(0, 5);
      if (unfinished[0]) {
        firstUndone.push(`${s.name}还可以一起完成：${unfinished[0]}`);
      }

      let timeline: any[] | undefined;
      if (!lite) {
        const planTitleById = new Map(
          planItems.map((p: any) => [p.planItemId, p.title as string]),
        );
        timeline = buildChildTimeline({
          studentId: s.id,
          studentName: s.name,
          checkins: (todayCheckins as CheckIn[]).filter((c) => c.studentId === s.id),
          redeems: (todayRedeems as WishRedeem[]).filter((r) => r.studentId === s.id),
          deferredTasks: tasks
            .filter((t) => t.deferredToday)
            .map((t) => ({ assignId: t.assignId, title: t.title })),
          planTitleById,
          dateKey: today,
          limit: 6,
        });
      }

      children.push({
        studentId: s.id,
        name: s.name,
        isRestDay,
        stats: {
          due,
          done,
          pendingConfirms: pendingCountByStudent.get(s.id) || 0,
          pointsBalance: s.pointsBalance,
          streak: streakByStudent.get(s.id) || 0,
        },
        byCategory,
        todayTasks: sortedTasks,
        deferredToday: deferredToday.length ? deferredToday : undefined,
        timeline,
        due,
        done,
        unfinishedTitles: unfinished,
        pointsBalance: s.pointsBalance,
        weekTheme: weekThemeById.get(s.id) || null,
        nextWish: lite ? undefined : nextWishByStudent.get(s.id) || null,
      });
    }

    children.sort((a, b) => {
      const score = (c: typeof a) => {
        if (c.stats.pendingConfirms > 0) return 0;
        if (c.stats.due > 0 && c.stats.done < c.stats.due) return 1;
        if (c.stats.due > 0 && c.stats.done >= c.stats.due) return 2;
        return 3;
      };
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return a.studentId - b.studentId;
    });

    const pendingList = (pendingRows as CheckIn[]).slice(0, 20).map((c) => ({
      id: c.id,
      studentId: c.studentId,
      studentName: c.student?.name,
      taskTitle: c.task?.title || '计划完成',
      note: c.note,
      imageUrl: c.imageUrl,
      createdAt: c.createdAt,
      isMakeup: !!c.isMakeup,
      makeupPeriodKey: c.makeupPeriodKey,
      assignId: c.assignId,
      planItemId: c.planItemId,
    }));

    const proposalRows = studentIds.length
      ? await this.tasks.listProposalsForParent(parentId)
      : [];
    const pendingProposals = proposalRows.slice(0, 20).map((p) => ({
      id: p.id,
      studentId: p.studentId,
      studentName: p.student?.name || '孩子',
      title: p.title,
      description: p.description,
      category: p.category,
      suggestedMinutes: p.suggestedMinutes,
      createdAt: p.createdAt,
    }));
    mark('proposals');

    let headline = `今天完成 ${totalDone}/${totalDue || 0}`;
    if (children.every((c) => c.isRestDay) && children.length) {
      headline = totalDue
        ? `今天是家庭休息日，约定任务先不催 · 完成 ${totalDone}/${totalDue}`
        : '今天是家庭休息日，约定任务先不催';
    } else if (!totalDue) headline = '今天还没有安排任务';
    else if (firstUndone[0]) headline = `${headline}，${firstUndone[0]}`;
    else headline = `${headline}，都很棒`;

    mark('assemble');

    // lite：跳过洞察尾查询；前端轮询保留上一轮 full 的 hints
    if (lite) {
      const out: any = {
        date: today,
        lite: true,
        family: {
          headline,
          totalDue,
          totalDone,
        },
        children,
        pendingConfirms: pendingList,
        pendingProposals,
        hints: {
          pactAlert: null,
          rewardFadeHint: null,
          fairnessHint: null,
          giftFairnessHint: null,
          overdueRedeemHint: null,
          parentOverloadHint: null,
          nearWishHint: null,
          birthOrderHint: null,
          coachInsights: [],
        },
        headline,
        totalDue,
        totalDone,
        pactAlert: null,
        rewardFadeHint: null,
        fairnessHint: null,
        giftFairnessHint: null,
        overdueRedeemHint: null,
        parentOverloadHint: null,
        nearWishHint: null,
        birthOrderHint: null,
        coachInsights: [],
      };
      if (timing) {
        mark('total');
        out._perf = marks;
      }
      return out;
    }

    const taskStatsP = this.tasks.taskActivityStatsForParent(parentId);
    const [
      pactAlert,
      settings,
      fairnessHint,
      overdueRedeemHint,
      giftFairnessHint,
      taskStats,
      coachInsights,
    ] = await Promise.all([
      this.pacts.alertForParent(parentId),
      this.family.getOrCreate(parentId),
      this.buildSharedFairnessHint(studentIds, students),
      this.buildOverdueRedeemHint(studentIds),
      this.buildGiftFairnessHint(studentIds, students),
      taskStatsP,
      taskStatsP.then((stats) =>
        this.computeCoachInsights(parentId, studentIds, stats),
      ),
    ]);
    mark('hints');

    const parentOverloadHint = this.computeParentOverloadHint(
      children,
      pendingList.length,
      taskStats,
    );

    const nearWishHint = this.buildNearWishHint(children);
    const birthOrderHint = this.buildBirthOrderHint(students);

    if (pactAlert.total) {
      const bits: string[] = [];
      if (pactAlert.parentPending) {
        bits.push(`${pactAlert.parentPending} 份待家长同意`);
      }
      if (pactAlert.overdue) {
        bits.push(`${pactAlert.overdue} 份已过还回日`);
      }
      headline = `${headline} · 积分约定：${bits.join('、')}`;
    }

    let maxStreak = 0;
    for (const sid of studentIds) {
      maxStreak = Math.max(maxStreak, streakByStudent.get(sid) || 0);
    }
    const rewardFadeHint = resolveRewardFadeHint(
      settings.rewardMode || 'always',
      settings.createdAt,
      { streak: maxStreak },
    );

    const out: any = {
      date: today,
      family: {
        headline,
        totalDue,
        totalDone,
      },
      children,
      pendingConfirms: pendingList,
      pendingProposals,
      hints: {
        pactAlert,
        rewardFadeHint,
        fairnessHint,
        giftFairnessHint,
        overdueRedeemHint,
        parentOverloadHint,
        nearWishHint,
        birthOrderHint,
        coachInsights,
      },
      rewardMode: settings.rewardMode || 'always',
      headline,
      totalDue,
      totalDone,
      pactAlert,
      rewardFadeHint,
      fairnessHint,
      giftFairnessHint,
      overdueRedeemHint,
      parentOverloadHint,
      nearWishHint,
      birthOrderHint,
      coachInsights,
    };
    if (timing) {
      mark('total');
      out._perf = marks;
    }
    return out;
  }

  /** Pending redeems waiting >3 days — remind parent to fulfill (托管须兑现) */
  private async buildOverdueRedeemHint(studentIds: number[]) {
    if (!studentIds.length) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REDEEM_OVERDUE_DAYS);
    const count = await this.redeems.count({
      where: {
        studentId: In(studentIds),
        status: RedeemStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });
    if (!count) return null;
    return {
      count,
      days: REDEEM_OVERDUE_DAYS,
      message: `有 ${count} 笔兑换已超过 ${REDEEM_OVERDUE_DAYS} 天未兑现。积分已由家长保管，尽快兑现能守住信任。`,
    };
  }

  /**
   * Soft hint when one child repeatedly gifts the same sibling (14d).
   * Action-oriented, avoids naming shame.
   */
  private async buildGiftFairnessHint(
    studentIds: number[],
    students: User[],
  ) {
    if (studentIds.length < 2) return null;
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const rows = await this.gifts.find({
      where: {
        fromStudentId: In(studentIds),
        status: PointGiftStatus.COMPLETED,
        acceptedAt: MoreThanOrEqual(since),
      },
    });
    if (rows.length < GIFT_PAIR_HINT_THRESHOLD) return null;

    const pairCounts = new Map<
      string,
      { fromId: number; toId: number; count: number }
    >();
    for (const g of rows) {
      const key = `${g.fromStudentId}->${g.toStudentId}`;
      const cur = pairCounts.get(key) || {
        fromId: g.fromStudentId,
        toId: g.toStudentId,
        count: 0,
      };
      cur.count += 1;
      pairCounts.set(key, cur);
    }
    let top: { fromId: number; toId: number; count: number } | null = null;
    for (const p of pairCounts.values()) {
      if (p.count < GIFT_PAIR_HINT_THRESHOLD) continue;
      if (!top || p.count > top.count) top = p;
    }
    if (!top) return null;

    const nameOf = (id: number) =>
      students.find((s) => s.id === id)?.name || '孩子';
    const fromName = nameOf(top.fromId);
    const toName = nameOf(top.toId);
    return {
      kind: 'gift_skew',
      fromName,
      toName,
      count: top.count,
      message: `近两周「${fromName}」多次向「${toName}」分享积分心意（${top.count} 次）。分享很好；若常为对方凑愿望，也可以一起做任务或打开家务轮值。`,
    };
  }

  /** 近端愿望可兑 / 快到手 → 家长软提示 */
  private buildNearWishHint(
    children: Array<{
      name: string;
      studentId: number;
      nextWish?: {
        title: string;
        lackPoints: number;
        isNearTerm?: boolean;
      } | null;
    }>,
  ): { message: string; studentId: number; ready: boolean } | null {
    let almost: {
      name: string;
      studentId: number;
      title: string;
      lack: number;
    } | null = null;
    for (const c of children) {
      const w = c.nextWish;
      if (!w?.isNearTerm) continue;
      if (w.lackPoints <= 0) {
        return {
          studentId: c.studentId,
          ready: true,
          message: `${c.name} 的近端愿望「${w.title}」可以商量兑现了`,
        };
      }
      if (w.lackPoints <= 5) {
        if (!almost || w.lackPoints < almost.lack) {
          almost = {
            name: c.name,
            studentId: c.studentId,
            title: w.title,
            lack: w.lackPoints,
          };
        }
      }
    }
    if (!almost) return null;
    return {
      studentId: almost.studentId,
      ready: false,
      message: `${almost.name} 的近端愿望「${almost.title}」还差 ${almost.lack} 分，再靠近一点就能商量兑现`,
    };
  }

  /** 近 14 天共享任务完成偏斜提示（家长摘要） */
  private async buildSharedFairnessHint(
    studentIds: number[],
    students: User[],
  ) {
    if (studentIds.length < 2) return null;
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const rows = await this.checkins.find({
      where: {
        studentId: In(studentIds),
        createdAt: MoreThanOrEqual(since),
      },
      relations: ['task'],
    });
    const counts = new Map<number, number>();
    for (const c of rows) {
      if (!c.task?.sharedComplete) continue;
      if (c.isMakeup) continue;
      if (
        c.confirmStatus === ConfirmStatus.PENDING ||
        c.confirmStatus === ConfirmStatus.REJECTED
      ) {
        continue;
      }
      counts.set(c.studentId, (counts.get(c.studentId) || 0) + 1);
    }
    return buildFairnessHint({
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        birthOrder: s.birthOrder,
        createdAt: s.createdAt,
      })),
      completions: [...counts.entries()].map(([studentId, count]) => ({
        studentId,
        count,
      })),
    });
  }

  /** 多孩未设家里排行：轮值排序会退化，软提示去学生管理补全 */
  private buildBirthOrderHint(
    students: Array<{ name: string; birthOrder?: number | null }>,
  ): { show: boolean; message: string; missingCount: number } | null {
    if (students.length < 2) return null;
    const missing = students.filter(
      (s) => s.birthOrder == null || Number(s.birthOrder) <= 0,
    );
    if (!missing.length) return null;
    const names = missing
      .slice(0, 2)
      .map((s) => s.name)
      .join('、');
    const more = missing.length > 2 ? `等 ${missing.length} 人` : '';
    return {
      show: true,
      missingCount: missing.length,
      message: `${names}${more}还没设家里排行。标一下老大/老二，按天轮值会更公平。`,
    };
  }

  private computeParentOverloadHint(
    children: { due?: number; stats?: { due: number } }[],
    pendingConfirms: number,
    taskStats: { activeTaskCount: number; confirmTaskCount: number },
  ) {
    const maxDailyDue = Math.max(
      0,
      ...children.map((c) => c.stats?.due ?? c.due ?? 0),
    );
    return buildParentOverloadHint({
      maxDailyDue,
      activeTaskCount: taskStats.activeTaskCount,
      confirmTaskCount: taskStats.confirmTaskCount,
      pendingConfirms,
    });
  }

  private async computeCoachInsights(
    parentId: number,
    studentIds: number[],
    taskStats?: { activeTaskCount: number; confirmTaskCount: number },
  ) {
    if (!studentIds.length) return [];
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceKey = formatDate(since);
    const [checkinRows, assigns, stats] = await Promise.all([
      this.checkins.find({
        where: {
          studentId: In(studentIds),
          createdAt: MoreThanOrEqual(since),
        },
        relations: ['task'],
      }),
      this.assigns.find({ where: { studentId: In(studentIds) } }),
      taskStats
        ? Promise.resolve(taskStats)
        : this.tasks.taskActivityStatsForParent(parentId),
    ]);
    let moodTired = 0;
    let moodHard = 0;
    let reflectionCount = 0;
    const slotStats = new Map<string, { done: number; total: number }>();
    for (const c of checkinRows) {
      if (c.moodTag === 'tired') moodTired++;
      if (c.moodTag === 'hard') moodHard++;
      if (c.reflectionText?.trim()) reflectionCount++;
      const slot = c.task?.timeSlot || 'anytime';
      const b = slotStats.get(slot) || { done: 0, total: 0 };
      b.total++;
      if (c.confirmStatus !== ConfirmStatus.REJECTED) b.done++;
      slotStats.set(slot, b);
    }
    const deferCount = assigns.filter(
      (a) => a.skipDate && a.skipDate >= sinceKey,
    ).length;
    const confirmRate =
      stats.activeTaskCount > 0
        ? stats.confirmTaskCount / stats.activeTaskCount
        : 0;
    const slotDoneRates = [...slotStats.entries()].map(([slot, v]) => ({
      slot,
      rate: v.total > 0 ? v.done / v.total : 0,
    }));
    return buildParentCoachInsights({
      moodTiredCount: moodTired,
      moodHardCount: moodHard,
      deferCount,
      focusUsedCount: 0,
      confirmRate,
      slotDoneRates,
      reflectionCount,
    });
  }
}
