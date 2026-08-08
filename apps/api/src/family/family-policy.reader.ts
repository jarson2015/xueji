import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FamilySettings } from '../entities/family-settings.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { User } from '../entities/user.entity';
import { formatDate } from '../common/date-util';
import { mergeRewardModes } from '../common/edu-policy-math';
import {
  effectiveSlotClockMap,
  sanitizeSlotClockMap,
} from '../common/slot-clock';

export type EduConfig = {
  rewardMode: string;
  ageBand: string;
  reflectionEnabled: boolean;
  intrinsicMode: boolean;
};

export type MakeupConfig = {
  enabled: boolean;
  discountPercent: number;
  windowDays: number;
};

export type RestConfig = {
  enabled: boolean;
  weeklyRestDays: number[];
  extraRestDates: string[];
  pauseAll: boolean;
  pauseCategories: string[];
};

export type AllowanceConfig = {
  allowanceLedgerEnabled: boolean;
  allowanceWeeklyCents: number | null;
  allowanceLargeCents: number;
  allowanceSavePercent: number;
  allowanceNote: string;
  allowanceAchievementBonusEnabled: boolean;
  allowanceAchievementBonusMaxCents: number;
};

export type PointsPactConfig = {
  pointsPactEnabled: boolean;
  pointsPactMaxAmount: number;
  pointsPactMaxActive: number;
  pointsPactMaxOverdueExtra: number;
  pointsPactNote: string;
  pointsPactParentApproveAbove: number;
};

export type PointsGiftConfig = {
  pointsGiftMaxAmount: number;
  pointsGiftParentApproveAbove: number;
  pointsGiftDailyMax: number;
  pointsGiftWeeklyOutMax: number;
};

export type SlotsConfig = {
  extendedEnabled: boolean;
  clockMap: Record<string, { startHour: number; endHour: number }> | null;
  clockEffective: Record<string, { startHour: number; endHour: number }>;
};

export type StudentPolicyBundle = {
  edu: EduConfig;
  makeup: MakeupConfig;
  rest: RestConfig;
  allowance: AllowanceConfig;
  pointsPact: PointsPactConfig;
  pointsGift: PointsGiftConfig;
  slots: SlotsConfig;
};

const DEFAULT_EDU: EduConfig = {
  rewardMode: 'always',
  ageBand: 'general',
  reflectionEnabled: true,
  intrinsicMode: false,
};
const DEFAULT_MAKEUP: MakeupConfig = {
  enabled: true,
  discountPercent: 50,
  windowDays: 7,
};
const DEFAULT_REST: RestConfig = {
  enabled: false,
  weeklyRestDays: [],
  extraRestDates: [],
  pauseAll: false,
  pauseCategories: ['study'],
};
const DEFAULT_ALLOWANCE: AllowanceConfig = {
  allowanceLedgerEnabled: false,
  allowanceWeeklyCents: null,
  allowanceLargeCents: 5000,
  allowanceSavePercent: 0,
  allowanceNote: '',
  allowanceAchievementBonusEnabled: false,
  allowanceAchievementBonusMaxCents: 20000,
};
const DEFAULT_PACT: PointsPactConfig = {
  pointsPactEnabled: false,
  pointsPactMaxAmount: 50,
  pointsPactMaxActive: 3,
  pointsPactMaxOverdueExtra: 30,
  pointsPactNote: '',
  pointsPactParentApproveAbove: 20,
};
const DEFAULT_GIFT: PointsGiftConfig = {
  pointsGiftMaxAmount: 20,
  pointsGiftParentApproveAbove: 10,
  pointsGiftDailyMax: 1,
  pointsGiftWeeklyOutMax: 40,
};
const DEFAULT_SLOTS: SlotsConfig = {
  extendedEnabled: false,
  clockMap: null,
  clockEffective: effectiveSlotClockMap(false, null),
};

/**
 * Batch family policy loader — 2 queries for N students, then in-memory getters.
 * Replaces per-student *ForStudent N+1 patterns.
 */
@Injectable()
export class FamilyPolicyReader {
  constructor(
    @InjectRepository(FamilySettings)
    private readonly settings: Repository<FamilySettings>,
    @InjectRepository(ParentStudent)
    private readonly links: Repository<ParentStudent>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async loadForStudents(
    studentIds: number[],
  ): Promise<Map<number, StudentPolicyBundle>> {
    const map = new Map<number, StudentPolicyBundle>();
    const unique = [...new Set(studentIds.filter((id) => id > 0))];
    for (const sid of unique) {
      map.set(sid, {
        edu: { ...DEFAULT_EDU },
        makeup: { ...DEFAULT_MAKEUP },
        rest: {
          enabled: false,
          weeklyRestDays: [],
          extraRestDates: [],
          pauseAll: false,
          pauseCategories: ['study'],
        },
        allowance: { ...DEFAULT_ALLOWANCE },
        pointsPact: { ...DEFAULT_PACT },
        pointsGift: { ...DEFAULT_GIFT },
        slots: {
          extendedEnabled: false,
          clockMap: null,
          clockEffective: effectiveSlotClockMap(false, null),
        },
      });
    }
    if (!unique.length) return map;

    const links = await this.links.find({
      where: { studentId: In(unique) },
    });
    const parentIds = [...new Set(links.map((l) => l.parentId))];
    const rows = parentIds.length
      ? await this.settings.find({ where: { parentId: In(parentIds) } })
      : [];
    const byParent = new Map(rows.map((r) => [r.parentId, r]));
    const parentsByStudent = new Map<number, number[]>();
    for (const l of links) {
      const arr = parentsByStudent.get(l.studentId) || [];
      arr.push(l.parentId);
      parentsByStudent.set(l.studentId, arr);
    }

    for (const sid of unique) {
      const studentRows = (parentsByStudent.get(sid) || [])
        .map((pid) => byParent.get(pid))
        .filter((r): r is FamilySettings => !!r);
      map.set(sid, this.mergeRows(studentRows));
    }

    // Per-child ageBand overrides family default
    const students = await this.users.find({
      where: { id: In(unique) },
      select: ['id', 'ageBand'],
    });
    for (const u of students) {
      const bundle = map.get(u.id);
      if (!bundle) continue;
      if (u.ageBand === 'young' || u.ageBand === 'general' || u.ageBand === 'teen') {
        bundle.edu.ageBand = u.ageBand;
      }
      if (bundle.edu.ageBand === 'young') {
        const gate = bundle.pointsPact.pointsPactParentApproveAbove;
        if (gate === 0 || gate > 10) {
          bundle.pointsPact.pointsPactParentApproveAbove = 10;
        }
      }
    }

    return map;
  }

  async loadOne(studentId: number): Promise<StudentPolicyBundle> {
    const map = await this.loadForStudents([studentId]);
    return (
      map.get(studentId) || {
        edu: { ...DEFAULT_EDU },
        makeup: { ...DEFAULT_MAKEUP },
        rest: { ...DEFAULT_REST },
        allowance: { ...DEFAULT_ALLOWANCE },
        pointsPact: { ...DEFAULT_PACT },
        pointsGift: { ...DEFAULT_GIFT },
        slots: {
          ...DEFAULT_SLOTS,
          clockEffective: effectiveSlotClockMap(false, null),
        },
      }
    );
  }

  /** Precompute rest flags for many students × many date keys (zero extra DB). */
  batchRestDayKeys(
    policies: Map<number, StudentPolicyBundle>,
    studentIds: number[],
    dateKeys: string[],
  ): Map<number, Map<string, boolean>> {
    const out = new Map<number, Map<string, boolean>>();
    for (const sid of studentIds) {
      const rest = policies.get(sid)?.rest || DEFAULT_REST;
      const dayMap = new Map<string, boolean>();
      for (const key of dateKeys) {
        dayMap.set(key, this.isRestDayKey(rest, key));
      }
      out.set(sid, dayMap);
    }
    return out;
  }

  isRestDay(config: RestConfig, date = new Date()): boolean {
    if (!config.enabled) return false;
    const key = formatDate(date);
    if (config.extraRestDates.includes(key)) return true;
    return config.weeklyRestDays.includes(this.shanghaiWeekday(date));
  }

  isRestDayKey(config: RestConfig, dateKey: string): boolean {
    if (!config.enabled) return false;
    if (config.extraRestDates.includes(dateKey)) return true;
    const [y, m, d] = dateKey.split('-').map(Number);
    const approx = new Date(Date.UTC(y, m - 1, d, 4, 0, 0));
    return config.weeklyRestDays.includes(this.shanghaiWeekday(approx));
  }

  shanghaiWeekday(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      weekday: 'short',
    }).formatToParts(date);
    const w = parts.find((p) => p.type === 'weekday')?.value || '';
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[w] ?? date.getDay();
  }

  private mergeRows(rows: FamilySettings[]): StudentPolicyBundle {
    if (!rows.length) {
      return {
        edu: { ...DEFAULT_EDU },
        makeup: { ...DEFAULT_MAKEUP },
        rest: { ...DEFAULT_REST },
        allowance: { ...DEFAULT_ALLOWANCE },
        pointsPact: { ...DEFAULT_PACT },
        pointsGift: { ...DEFAULT_GIFT },
        slots: { ...DEFAULT_SLOTS, clockEffective: effectiveSlotClockMap(false, null) },
      };
    }
    const weekly = new Set<number>();
    const extras = new Set<string>();
    const pauseCats = new Set<string>();
    let enabled = false;
    let pauseAll = false;
    for (const r of rows) {
      if (r.restDaysEnabled) enabled = true;
      if (r.restPauseAll) pauseAll = true;
      for (const d of r.weeklyRestDays || []) weekly.add(d);
      for (const d of r.extraRestDates || []) extras.add(d);
      const cats = r.restPauseCategories;
      if (cats?.length) {
        for (const c of cats) pauseCats.add(c);
      } else if (r.restDaysEnabled) {
        // Enabled without explicit cats → legacy study-only
        pauseCats.add('study');
      }
    }
    const approveValues = rows.map(
      (r) => r.pointsPactParentApproveAbove ?? 20,
    );
    const positive = approveValues.filter((v) => v > 0);
    return {
      edu: {
        rewardMode: mergeRewardModes(rows.map((r) => r.rewardMode || 'always')),
        ageBand:
          rows.find((r) => r.ageBand && r.ageBand !== 'general')?.ageBand ||
          rows[0].ageBand ||
          'general',
        reflectionEnabled: rows.every((r) => r.reflectionEnabled !== false),
        intrinsicMode: rows.some((r) => !!r.intrinsicMode),
      },
      makeup: {
        enabled: rows.some((r) => r.makeupEnabled !== false),
        discountPercent: Math.min(
          ...rows.map((r) => r.makeupDiscountPercent ?? 50),
        ),
        windowDays: Math.max(...rows.map((r) => r.makeupWindowDays ?? 7)),
      },
      rest: {
        enabled,
        weeklyRestDays: [...weekly].sort(),
        extraRestDates: [...extras].sort(),
        pauseAll,
        pauseCategories: pauseCats.size
          ? [...pauseCats].sort()
          : ['study'],
      },
      allowance: {
        allowanceLedgerEnabled: rows.some((r) => !!r.allowanceLedgerEnabled),
        allowanceWeeklyCents:
          rows.map((r) => r.allowanceWeeklyCents).find((v) => v != null && v > 0) ??
          null,
        allowanceLargeCents: Math.min(
          ...rows.map((r) => r.allowanceLargeCents ?? 5000),
        ),
        allowanceSavePercent: Math.max(
          ...rows.map((r) => r.allowanceSavePercent ?? 0),
        ),
        allowanceNote:
          rows.map((r) => r.allowanceNote).find((n) => n?.trim()) ||
          '零花钱和学迹积分是两套：积分换愿望，零花钱练真实用钱。',
        allowanceAchievementBonusEnabled: rows.some(
          (r) => !!r.allowanceAchievementBonusEnabled,
        ),
        allowanceAchievementBonusMaxCents: Math.min(
          ...rows.map((r) => r.allowanceAchievementBonusMaxCents ?? 20000),
        ),
      },
      pointsPact: {
        pointsPactEnabled: rows.some((r) => !!r.pointsPactEnabled),
        pointsPactMaxAmount: Math.min(
          ...rows.map((r) => r.pointsPactMaxAmount ?? 50),
        ),
        pointsPactMaxActive: Math.min(
          ...rows.map((r) => r.pointsPactMaxActive ?? 3),
        ),
        pointsPactMaxOverdueExtra: Math.min(
          ...rows.map((r) => r.pointsPactMaxOverdueExtra ?? 30),
        ),
        pointsPactNote:
          rows.map((r) => r.pointsPactNote).find((n) => n?.trim()) ||
          '积分可以按约定暂时借用，但积分不是钱，也不能换成零花钱。说到做到，才是这份约定要练的。',
        pointsPactParentApproveAbove: positive.length
          ? Math.min(...positive)
          : 0,
      },
      pointsGift: {
        pointsGiftMaxAmount: Math.min(
          ...rows.map((r) => r.pointsGiftMaxAmount ?? 20),
        ),
        pointsGiftParentApproveAbove: (() => {
          const vals = rows.map((r) => r.pointsGiftParentApproveAbove ?? 10);
          const pos = vals.filter((v) => v > 0);
          return pos.length ? Math.min(...pos) : 0;
        })(),
        pointsGiftDailyMax: Math.min(
          ...rows.map((r) => r.pointsGiftDailyMax ?? 1),
        ),
        pointsGiftWeeklyOutMax: Math.min(
          ...rows.map((r) => r.pointsGiftWeeklyOutMax ?? 40),
        ),
      },
      slots: (() => {
        const extendedEnabled = rows.some((r) => !!r.slotExtendedEnabled);
        const clockMap =
          rows
            .map((r) => sanitizeSlotClockMap(r.slotClockMap))
            .find((m) => m != null) ?? null;
        return {
          extendedEnabled,
          clockMap,
          clockEffective: effectiveSlotClockMap(extendedEnabled, clockMap),
        };
      })(),
    };
  }
}
