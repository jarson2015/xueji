import {
  BadRequestException,
  Injectable,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FamilySettings } from '../entities/family-settings.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { User } from '../entities/user.entity';
import { UpdateFamilySettingsDto } from './dto';
import { FamilyPolicyReader, type RestConfig } from './family-policy.reader';
import { EventsGateway } from '../events/events.gateway';
import { StudentsService } from '../students/students.service';
import {
  effectiveSlotClockMap,
  sanitizeSlotClockMap,
} from '../common/slot-clock';
import { normalizeHm } from '../common/date-util';
import { AutoConfirmPendingScheduler } from '../checkins/auto-confirm-pending.scheduler';

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(FamilySettings)
    private readonly settings: Repository<FamilySettings>,
    @InjectRepository(ParentStudent)
    private readonly links: Repository<ParentStudent>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly policy: FamilyPolicyReader,
    @Optional() private readonly events?: EventsGateway,
    @Optional() private readonly students?: StudentsService,
    @Optional()
    @Inject(forwardRef(() => AutoConfirmPendingScheduler))
    private readonly autoConfirmScheduler?: AutoConfirmPendingScheduler,
  ) {}

  async getOrCreate(parentId: number) {
    let row = await this.settings.findOne({ where: { parentId } });
    if (!row) {
      row = await this.settings.save(
        this.settings.create({
          parentId,
          weeklyRestDays: [],
          extraRestDates: [],
          rewardMode: 'random',
        }),
      );
    }
    return this.toDto(row);
  }

  async update(parentId: number, dto: UpdateFamilySettingsDto) {
    let row = await this.settings.findOne({ where: { parentId } });
    if (!row) {
      row = this.settings.create({
        parentId,
        weeklyRestDays: [],
        extraRestDates: [],
      });
    }
    if (dto.weeklyRestDays !== undefined) {
      row.weeklyRestDays = [...new Set(dto.weeklyRestDays)].sort();
    }
    if (dto.extraRestDates !== undefined) {
      row.extraRestDates = [...new Set(dto.extraRestDates)].sort();
    }
    if (dto.restDaysEnabled !== undefined) {
      row.restDaysEnabled = dto.restDaysEnabled;
    }
    if (dto.restPauseAll !== undefined) {
      row.restPauseAll = dto.restPauseAll;
    }
    if (dto.restPauseCategories !== undefined) {
      row.restPauseCategories = [...new Set(dto.restPauseCategories)];
    }
    if (dto.makeupEnabled !== undefined) row.makeupEnabled = dto.makeupEnabled;
    if (dto.makeupDiscountPercent !== undefined) {
      row.makeupDiscountPercent = dto.makeupDiscountPercent;
    }
    if (dto.makeupWindowDays !== undefined) {
      row.makeupWindowDays = dto.makeupWindowDays;
    }
    if (dto.rewardMode !== undefined) row.rewardMode = dto.rewardMode;
    if (dto.intrinsicMode !== undefined) row.intrinsicMode = dto.intrinsicMode;
    if (dto.ageBand !== undefined) row.ageBand = dto.ageBand;
    if (dto.reflectionEnabled !== undefined) {
      row.reflectionEnabled = dto.reflectionEnabled;
    }
    if (dto.goldenFingerNote !== undefined) {
      row.goldenFingerNote = dto.goldenFingerNote || null;
    }
    if (dto.covenantNote !== undefined) {
      row.covenantNote = dto.covenantNote || null;
    }
    if (dto.allowanceLedgerEnabled !== undefined) {
      row.allowanceLedgerEnabled = dto.allowanceLedgerEnabled;
    }
    if (dto.allowanceWeeklyCents !== undefined) {
      row.allowanceWeeklyCents = dto.allowanceWeeklyCents;
    }
    if (dto.allowanceLargeCents !== undefined) {
      row.allowanceLargeCents = dto.allowanceLargeCents;
    }
    if (dto.allowanceSavePercent !== undefined) {
      row.allowanceSavePercent = dto.allowanceSavePercent;
    }
    if (dto.allowanceNote !== undefined) {
      row.allowanceNote = dto.allowanceNote || null;
    }
    if (dto.pointsPactEnabled !== undefined) {
      if (dto.pointsPactEnabled) {
        await this.assertPointsPactAllowed(parentId, row);
      }
      row.pointsPactEnabled = dto.pointsPactEnabled;
    } else if (dto.ageBand === 'young' && row.pointsPactEnabled) {
      row.pointsPactEnabled = false;
    }
    if (dto.pointsPactMaxAmount !== undefined) {
      row.pointsPactMaxAmount = dto.pointsPactMaxAmount;
    }
    if (dto.pointsPactMaxActive !== undefined) {
      row.pointsPactMaxActive = dto.pointsPactMaxActive;
    }
    if (dto.pointsPactMaxOverdueExtra !== undefined) {
      row.pointsPactMaxOverdueExtra = dto.pointsPactMaxOverdueExtra;
    }
    if (dto.pointsPactNote !== undefined) {
      row.pointsPactNote = dto.pointsPactNote || null;
    }
    if (dto.pointsPactParentApproveAbove !== undefined) {
      row.pointsPactParentApproveAbove = dto.pointsPactParentApproveAbove;
    }
    if (dto.pointsGiftMaxAmount !== undefined) {
      row.pointsGiftMaxAmount = dto.pointsGiftMaxAmount;
    }
    if (dto.pointsGiftParentApproveAbove !== undefined) {
      row.pointsGiftParentApproveAbove = dto.pointsGiftParentApproveAbove;
    }
    if (dto.pointsGiftDailyMax !== undefined) {
      row.pointsGiftDailyMax = dto.pointsGiftDailyMax;
    }
    if (dto.pointsGiftWeeklyOutMax !== undefined) {
      row.pointsGiftWeeklyOutMax = dto.pointsGiftWeeklyOutMax;
    }
    if (dto.dailySkipLimit !== undefined) {
      row.dailySkipLimit = dto.dailySkipLimit;
    }
    if (dto.autoConfirmPendingEnabled !== undefined) {
      row.autoConfirmPendingEnabled = dto.autoConfirmPendingEnabled;
      if (dto.autoConfirmPendingEnabled) {
        this.autoConfirmScheduler?.bumpEnabledCache();
      }
    }
    if (dto.autoConfirmPendingTime !== undefined) {
      const hm = normalizeHm(dto.autoConfirmPendingTime);
      if (!hm) {
        throw new BadRequestException('自动确认时间须为 HH:mm');
      }
      row.autoConfirmPendingTime = hm;
    }
    if (dto.slotExtendedEnabled !== undefined) {
      row.slotExtendedEnabled = dto.slotExtendedEnabled;
    }
    if (dto.slotClockMap !== undefined) {
      row.slotClockMap = sanitizeSlotClockMap(dto.slotClockMap);
    }
    await this.settings.save(row);
    const result = this.toDto(row);
    await this.emitSettingsChanged(parentId, result);
    return result;
  }

  /** Notify co-parents + students so feature-flag nav refreshes live */
  private async emitSettingsChanged(
    parentId: number,
    dto: ReturnType<FamilyService['toDto']>,
  ) {
    if (!this.events || !this.students) return;
    const payload = {
      allowanceLedgerEnabled: dto.allowanceLedgerEnabled,
      pointsPactEnabled: dto.pointsPactEnabled,
      at: new Date().toISOString(),
    };
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    const parentIds = new Set<number>([parentId]);
    for (const sid of studentIds) {
      for (const pid of await this.students.getParentIdsOfStudent(sid)) {
        parentIds.add(pid);
      }
      this.events.emitToStudent(sid, 'family:settings', payload);
    }
    this.events.emitToParents([...parentIds], 'family:settings', payload);
  }

  /** Low-age families (default or any child) must not enable points lending. */
  private async assertPointsPactAllowed(
    parentId: number,
    row: FamilySettings,
  ) {
    if (row.ageBand === 'young') {
      throw new BadRequestException(
        '低龄家庭暂不开放积分借贷，请用一起完成或轮值代替',
      );
    }
    const links = await this.links.find({ where: { parentId } });
    const ids = links.map((l) => l.studentId);
    if (!ids.length) return;
    const young = await this.users.count({
      where: { id: In(ids), ageBand: 'young' },
    });
    if (young > 0) {
      throw new BadRequestException(
        '有孩子标记为低龄时暂不开放积分借贷，请用一起完成或轮值代替',
      );
    }
  }

  /** Public covenant snapshot for a student (union of co-parent rules). */
  async covenantForStudent(studentId: number) {
    const bundle = await this.policy.loadOne(studentId);
    const links = await this.links.find({ where: { studentId } });
    const rows = links.length
      ? await this.settings.find({
          where: { parentId: In(links.map((l) => l.parentId)) },
        })
      : [];
    const goldenFingerNote =
      rows.map((r) => r.goldenFingerNote).find((n) => n?.trim()) ||
      '用积分兑换一次「先缓缓做家务」。免做不是责任消失：可以改日补做、换一件力所能及的事，或和家人说一声一起分担。';
    const covenantNote =
      rows.map((r) => r.covenantNote).find((n) => n?.trim()) || '';
    const dailySkipLimit = Math.min(
      ...rows.map((r) => r.dailySkipLimit ?? 1),
      5,
    );
    return {
      weeklyRestDays: bundle.rest.weeklyRestDays,
      extraRestDates: bundle.rest.extraRestDates,
      restDaysEnabled: bundle.rest.enabled,
      restPauseAll: bundle.rest.pauseAll,
      restPauseCategories: bundle.rest.pauseCategories,
      makeupEnabled: bundle.makeup.enabled,
      makeupDiscountPercent: bundle.makeup.discountPercent,
      makeupWindowDays: bundle.makeup.windowDays,
      rewardMode: bundle.edu.rewardMode,
      ageBand: bundle.edu.ageBand,
      reflectionEnabled: bundle.edu.reflectionEnabled,
      goldenFingerNote,
      covenantNote,
      nudgeHint: '家长可以轻轻提醒，但不会太频繁。',
      dailySkipLimit: Number.isFinite(dailySkipLimit) ? dailySkipLimit : 1,
      ...bundle.allowance,
      ...bundle.pointsPact,
      ...bundle.pointsGift,
      slotExtendedEnabled: bundle.slots.extendedEnabled,
      slotClockMap: bundle.slots.clockMap,
      slotClockEffective: bundle.slots.clockEffective,
    };
  }

  async allowanceConfigForStudent(studentId: number) {
    return (await this.policy.loadOne(studentId)).allowance;
  }

  async pointsPactConfigForStudent(studentId: number) {
    return (await this.policy.loadOne(studentId)).pointsPact;
  }

  async eduConfigForStudent(studentId: number) {
    return (await this.policy.loadOne(studentId)).edu;
  }

  async makeupConfigForStudent(studentId: number) {
    return (await this.policy.loadOne(studentId)).makeup;
  }

  async restConfigForStudent(studentId: number) {
    return (await this.policy.loadOne(studentId)).rest;
  }

  isRestDay(config: RestConfig, date = new Date()): boolean {
    return this.policy.isRestDay(config, date);
  }

  async isRestDayForStudent(studentId: number, date = new Date()) {
    const config = await this.restConfigForStudent(studentId);
    return this.isRestDay(config, date);
  }

  /** Batch rest-day flags for many students (one settings load). */
  async isRestDayForStudents(studentIds: number[], date = new Date()) {
    const policies = await this.policy.loadForStudents(studentIds);
    const result = new Map<number, boolean>();
    for (const sid of studentIds) {
      const rest = policies.get(sid)?.rest || {
        enabled: false,
        weeklyRestDays: [],
        extraRestDates: [],
        pauseAll: false,
        pauseCategories: ['study'],
      };
      result.set(sid, this.policy.isRestDay(rest, date));
    }
    return result;
  }

  /** Rest configs for many students (one settings load). */
  async restConfigsForStudents(studentIds: number[]) {
    const policies = await this.policy.loadForStudents(studentIds);
    const result = new Map<number, RestConfig>();
    for (const sid of studentIds) {
      result.set(
        sid,
        policies.get(sid)?.rest || {
          enabled: false,
          weeklyRestDays: [],
          extraRestDates: [],
          pauseAll: false,
          pauseCategories: ['study'],
        },
      );
    }
    return result;
  }

  /** Batch rest keys for streak/reports — 1 settings load, 0 per-day queries. */
  async batchRestDayKeys(studentIds: number[], dateKeys: string[]) {
    const policies = await this.policy.loadForStudents(studentIds);
    return this.policy.batchRestDayKeys(policies, studentIds, dateKeys);
  }

  async isRestDayKeyForStudent(studentId: number, dateKey: string) {
    const config = await this.restConfigForStudent(studentId);
    return this.policy.isRestDayKey(config, dateKey);
  }

  private toDto(row: FamilySettings) {
    return {
      parentId: row.parentId,
      weeklyRestDays: row.weeklyRestDays || [],
      extraRestDates: row.extraRestDates || [],
      restDaysEnabled: !!row.restDaysEnabled,
      restPauseAll: !!row.restPauseAll,
      restPauseCategories: row.restPauseCategories?.length
        ? row.restPauseCategories
        : ['study'],
      makeupEnabled: row.makeupEnabled !== false,
      makeupDiscountPercent: row.makeupDiscountPercent ?? 50,
      makeupWindowDays: row.makeupWindowDays ?? 7,
      rewardMode: row.rewardMode || 'always',
      intrinsicMode: !!row.intrinsicMode,
      ageBand: row.ageBand || 'general',
      reflectionEnabled: row.reflectionEnabled !== false,
      goldenFingerNote:
        row.goldenFingerNote ||
        '用积分兑换一次「先缓缓做家务」。免做不是责任消失：可以改日补做、换一件力所能及的事，或和家人说一声一起分担。',
      covenantNote: row.covenantNote || '',
      allowanceLedgerEnabled: !!row.allowanceLedgerEnabled,
      allowanceWeeklyCents: row.allowanceWeeklyCents ?? null,
      allowanceLargeCents: row.allowanceLargeCents ?? 5000,
      allowanceSavePercent: row.allowanceSavePercent ?? 0,
      allowanceNote: row.allowanceNote || '',
      pointsPactEnabled: !!row.pointsPactEnabled,
      pointsPactMaxAmount: row.pointsPactMaxAmount ?? 50,
      pointsPactMaxActive: row.pointsPactMaxActive ?? 3,
      pointsPactMaxOverdueExtra: row.pointsPactMaxOverdueExtra ?? 30,
      pointsPactNote: row.pointsPactNote || '',
      pointsPactParentApproveAbove: row.pointsPactParentApproveAbove ?? 20,
      pointsGiftMaxAmount: row.pointsGiftMaxAmount ?? 20,
      pointsGiftParentApproveAbove: row.pointsGiftParentApproveAbove ?? 10,
      pointsGiftDailyMax: row.pointsGiftDailyMax ?? 1,
      pointsGiftWeeklyOutMax: row.pointsGiftWeeklyOutMax ?? 40,
      dailySkipLimit: row.dailySkipLimit ?? 1,
      autoConfirmPendingEnabled: !!row.autoConfirmPendingEnabled,
      autoConfirmPendingTime:
        normalizeHm(row.autoConfirmPendingTime) || '23:30',
      autoConfirmPendingLastRunDate: row.autoConfirmPendingLastRunDate || null,
      slotExtendedEnabled: !!row.slotExtendedEnabled,
      slotClockMap: sanitizeSlotClockMap(row.slotClockMap),
      /** 合并默认后的有效映射，前端可直接用于时钟 */
      slotClockEffective: effectiveSlotClockMap(
        !!row.slotExtendedEnabled,
        sanitizeSlotClockMap(row.slotClockMap),
      ),
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }
}
