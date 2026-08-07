import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CheckIn } from '../entities/checkin.entity';
import { ConfirmStatus, TaskSchedule } from '../common/enums';
import { formatDate } from '../common/date-util';
import {
  streakPausesOnRestDay,
  type RestPausePolicy,
} from '../common/rest-day-policy';
import {
  countRhythmInWindow,
  HABIT_RHYTHM_TARGET,
  HABIT_RHYTHM_WINDOW,
} from '../common/habit-rhythm';
import { FamilyService } from '../family/family.service';

export type HabitRhythm = {
  doneDays: number;
  windowDays: number;
  targetDays: number;
  onTrack: boolean;
};

/** Count consecutive calendar days with valid checkin; paused categories skip rest days without breaking streak */
@Injectable()
export class TaskStreakService {
  constructor(
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @Optional()
    @Inject(forwardRef(() => FamilyService))
    private readonly family?: FamilyService,
  ) {}

  async streakForTask(
    studentId: number,
    taskId: number,
    category?: string | null,
    manager?: EntityManager,
    restDayMap?: Map<string, boolean>,
    pause?: RestPausePolicy,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(CheckIn) : this.checkins;
    const rows = await repo.find({
      where: {
        studentId,
        taskId,
        confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
      },
      order: { createdAt: 'DESC' },
      take: 120,
    });
    const daySet = new Set(rows.map((r) => formatDate(r.createdAt)));
    let map = restDayMap;
    let pausePolicy = pause;
    if ((!map || !pausePolicy) && this.family) {
      const loaded = await this.loadRestContext(studentId);
      map = map || loaded.map;
      pausePolicy = pausePolicy || loaded.pause;
    }
    return this.countStreak(daySet, category, map, pausePolicy);
  }

  private async loadRestContext(studentId: number) {
    const keys: string[] = [];
    const d = new Date();
    for (let i = 0; i < 90; i++) {
      keys.push(formatDate(d));
      d.setDate(d.getDate() - 1);
    }
    const [batch, rest] = await Promise.all([
      this.family!.batchRestDayKeys([studentId], keys),
      this.family!.restConfigForStudent(studentId),
    ]);
    return {
      map: batch.get(studentId) || new Map<string, boolean>(),
      pause: {
        pauseAll: !!rest.pauseAll,
        pauseCategories: rest.pauseCategories?.length
          ? rest.pauseCategories
          : ['study'],
      } as RestPausePolicy,
    };
  }

  /**
   * Batch habit streaks for one student: 1 checkins query + optional preloaded rest map.
   */
  async batchStreaks(
    studentId: number,
    items: { taskId: number; schedule: string; category?: string }[],
    restDayMap?: Map<string, boolean>,
    pause?: RestPausePolicy,
  ): Promise<Map<number, number>> {
    const out = new Map<number, number>();
    const dailyIds = [
      ...new Set(
        items
          .filter((i) => i.schedule === TaskSchedule.DAILY && i.taskId)
          .map((i) => i.taskId),
      ),
    ];
    for (const id of dailyIds) out.set(id, 0);
    if (!dailyIds.length) return out;

    let map = restDayMap;
    let pausePolicy = pause;
    if ((!map || !pausePolicy) && this.family) {
      const loaded = await this.loadRestContext(studentId);
      map = map || loaded.map;
      pausePolicy = pausePolicy || loaded.pause;
    }

    const rows = await this.checkins.find({
      where: {
        studentId,
        taskId: In(dailyIds),
        confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
      },
      order: { createdAt: 'DESC' },
      take: 120 * dailyIds.length,
    });
    const byTask = new Map<number, Set<string>>();
    for (const r of rows) {
      if (!r.taskId) continue;
      let set = byTask.get(r.taskId);
      if (!set) {
        set = new Set();
        byTask.set(r.taskId, set);
      }
      set.add(formatDate(r.createdAt));
    }
    const catByTask = new Map(
      items.map((i) => [i.taskId, i.category] as const),
    );
    for (const taskId of dailyIds) {
      out.set(
        taskId,
        this.countStreak(
          byTask.get(taskId) || new Set(),
          catByTask.get(taskId),
          map,
          pausePolicy,
        ),
      );
    }
    return out;
  }

  rhythmFromDaySet(daySet: Set<string>): HabitRhythm {
    const doneDays = countRhythmInWindow(daySet);
    return {
      doneDays,
      windowDays: HABIT_RHYTHM_WINDOW,
      targetDays: HABIT_RHYTHM_TARGET,
      onTrack: doneDays >= HABIT_RHYTHM_TARGET,
    };
  }

  async rhythmForTask(
    studentId: number,
    taskId: number,
    manager?: EntityManager,
  ): Promise<HabitRhythm> {
    const repo = manager ? manager.getRepository(CheckIn) : this.checkins;
    const rows = await repo.find({
      where: {
        studentId,
        taskId,
        confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
      },
      order: { createdAt: 'DESC' },
      take: 120,
    });
    const daySet = new Set(rows.map((r) => formatDate(r.createdAt)));
    return this.rhythmFromDaySet(daySet);
  }

  async attachStreaks<
    T extends { taskId: number; schedule: string; category?: string },
  >(
    studentId: number,
    items: T[],
  ): Promise<(T & { habitStreak: number; habitRhythm?: HabitRhythm })[]> {
    const dailyIds = [
      ...new Set(
        items
          .filter((i) => i.schedule === TaskSchedule.DAILY && i.taskId)
          .map((i) => i.taskId),
      ),
    ];
    const streaks = new Map<number, number>();
    const rhythmByTask = new Map<number, HabitRhythm>();
    for (const id of dailyIds) {
      streaks.set(id, 0);
      rhythmByTask.set(id, this.rhythmFromDaySet(new Set()));
    }
    if (!dailyIds.length) {
      return items.map((item) => ({
        ...item,
        habitStreak: 0,
        habitRhythm: undefined,
      }));
    }

    let map: Map<string, boolean> | undefined;
    let pausePolicy: RestPausePolicy | undefined;
    if (this.family) {
      const loaded = await this.loadRestContext(studentId);
      map = loaded.map;
      pausePolicy = loaded.pause;
    }

    const rows = await this.checkins.find({
      where: {
        studentId,
        taskId: In(dailyIds),
        confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
      },
      order: { createdAt: 'DESC' },
      take: 120 * dailyIds.length,
    });
    const byTask = new Map<number, Set<string>>();
    for (const r of rows) {
      if (!r.taskId) continue;
      let set = byTask.get(r.taskId);
      if (!set) {
        set = new Set();
        byTask.set(r.taskId, set);
      }
      set.add(formatDate(r.createdAt));
    }
    const catByTask = new Map(
      items.map((i) => [i.taskId, i.category] as const),
    );
    for (const taskId of dailyIds) {
      const daySet = byTask.get(taskId) || new Set();
      streaks.set(
        taskId,
        this.countStreak(daySet, catByTask.get(taskId), map, pausePolicy),
      );
      rhythmByTask.set(taskId, this.rhythmFromDaySet(daySet));
    }

    return items.map((item) => ({
      ...item,
      habitStreak:
        item.schedule === TaskSchedule.DAILY
          ? streaks.get(item.taskId) || 0
          : 0,
      habitRhythm:
        item.schedule === TaskSchedule.DAILY
          ? rhythmByTask.get(item.taskId)
          : undefined,
    }));
  }

  private countStreak(
    daySet: Set<string>,
    category?: string | null,
    restDayMap?: Map<string, boolean>,
    pause?: RestPausePolicy,
  ): number {
    let streak = 0;
    const d = new Date();
    const pauseOnRest = streakPausesOnRestDay(category, pause);
    for (let i = 0; i < 90; i++) {
      const key = formatDate(d);
      const isRest = pauseOnRest ? !!restDayMap?.get(key) : false;
      if (daySet.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (isRest || i === 0) {
        d.setDate(d.getDate() - 1);
        continue;
      } else break;
    }
    return streak;
  }
}
