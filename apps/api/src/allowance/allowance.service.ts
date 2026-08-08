import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AllowanceCategory,
  AllowanceEntryStatus,
  AllowanceGoalStatus,
  AllowanceKind,
  UserRole,
} from '../common/enums';
import { AllowanceAccount } from '../entities/allowance-account.entity';
import { AllowanceEntry } from '../entities/allowance-entry.entity';
import { AllowanceGoal } from '../entities/allowance-goal.entity';
import { AchievementClaim } from '../entities/achievement-claim.entity';
import { StudentsService } from '../students/students.service';
import { FamilyService } from '../family/family.service';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../family/audit.service';
import {
  requiredSaveCents,
  canSpendAfterSaveFirst,
} from '../common/edu-policy-math';
import { requireSafeUploadPath } from '../common/upload-url';
import {
  CreateAchievementClaimDto,
  CreateAllowanceEntryDto,
  CreateAllowanceGoalDto,
  ReviewAllowanceEntryDto,
  SaveToGoalDto,
  UpdateAllowanceGoalDto,
} from './dto';

const INCOME_KINDS = new Set<AllowanceKind>([
  AllowanceKind.POCKET_MONEY,
  AllowanceKind.BONUS,
  AllowanceKind.GIFT_IN,
  AllowanceKind.UNSAVE,
  AllowanceKind.ADJUST,
]);

@Injectable()
export class AllowanceService {
  constructor(
    @InjectRepository(AllowanceAccount)
    private readonly accounts: Repository<AllowanceAccount>,
    @InjectRepository(AllowanceEntry)
    private readonly entries: Repository<AllowanceEntry>,
    @InjectRepository(AllowanceGoal)
    private readonly goals: Repository<AllowanceGoal>,
    @InjectRepository(AchievementClaim)
    private readonly claims: Repository<AchievementClaim>,
    private readonly students: StudentsService,
    private readonly family: FamilyService,
    private readonly events: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async summaryForStudent(studentId: number) {
    const cfg = await this.family.allowanceConfigForStudent(studentId);
    if (!cfg.allowanceLedgerEnabled) {
      return { enabled: false as const, ...cfg };
    }
    const account = await this.getOrCreateAccount(studentId);
    const recent = await this.entries.find({
      where: { studentId },
      order: { id: 'DESC' },
      take: 30,
    });
    const activeGoals = await this.goals.find({
      where: { studentId, status: AllowanceGoalStatus.ACTIVE },
      order: { id: 'DESC' },
    });
    const pending = recent.filter(
      (e) => e.status === AllowanceEntryStatus.PENDING,
    );
    const weekSpent = await this.weekSpentCents(studentId);
    const weekSaved = await this.weekSavedCents(studentId);
    const requiredSave = requiredSaveCents(
      cfg.allowanceWeeklyCents,
      cfg.allowanceSavePercent ?? 0,
    );
    const saveCheck = canSpendAfterSaveFirst(weekSaved, requiredSave);
    return {
      enabled: true as const,
      ...cfg,
      account: this.accountDto(account),
      entries: recent.map((e) => this.entryDto(e)),
      goals: activeGoals.map((g) => this.goalDto(g)),
      pendingCount: pending.length,
      weekSpentCents: weekSpent,
      weekSavedCents: weekSaved,
      requiredSaveCents: requiredSave,
      saveFirstOk: saveCheck.ok,
      saveFirstHint: saveCheck.ok
        ? null
        : requiredSave <= 1
          ? '先存一点到目标，再花钱——先存后花更稳妥'
          : `本周建议先存 ${(requiredSave / 100).toFixed(2)} 元（已存 ${(weekSaved / 100).toFixed(2)}），先存后花`,
    };
  }

  async summaryForParent(parentId: number, studentId: number) {
    await this.students.assertBound(parentId, studentId);
    return this.summaryForStudent(studentId);
  }

  async listEntries(
    user: { id: number; role: string },
    studentId?: number,
    take = 50,
  ) {
    let sid = studentId;
    if (user.role === UserRole.STUDENT) {
      sid = user.id;
      await this.assertEnabled(sid);
    } else {
      if (!sid) throw new BadRequestException('请选择孩子');
      await this.students.assertBound(user.id, sid);
      await this.assertEnabled(sid);
    }
    const rows = await this.entries.find({
      where: { studentId: sid },
      order: { id: 'DESC' },
      take: Math.min(take, 100),
    });
    return rows.map((e) => this.entryDto(e));
  }

  async createEntry(
    user: { id: number; role: string; name?: string },
    dto: CreateAllowanceEntryDto,
  ) {
    const isParent = user.role === UserRole.PARENT;
    const studentId = isParent ? dto.studentId : user.id;
    if (!studentId) throw new BadRequestException('请选择孩子');
    if (isParent) await this.students.assertBound(user.id, studentId);
    await this.assertEnabled(studentId);

    this.assertKindAllowed(user.role, dto.kind);

    const signed = this.signedDelta(dto.kind, dto.amountCents);
    if (signed === 0) throw new BadRequestException('金额无效');

    const cfg = await this.family.allowanceConfigForStudent(studentId);
    const needsReview =
      !isParent &&
      dto.kind === AllowanceKind.SPEND &&
      Math.abs(signed) >= (cfg.allowanceLargeCents || 5000);

    if (!isParent && dto.kind === AllowanceKind.SPEND) {
      const weekSaved = await this.weekSavedCents(studentId);
      const required = requiredSaveCents(
        cfg.allowanceWeeklyCents,
        cfg.allowanceSavePercent ?? 0,
      );
      const check = canSpendAfterSaveFirst(weekSaved, required);
      if (!check.ok) {
        throw new BadRequestException(
          required <= 1
            ? '先存一点到目标，再花钱——先存后花更稳妥'
            : `本周建议先存 ${(required / 100).toFixed(2)} 元，还差约 ${(check.lackCents / 100).toFixed(2)} 元。先存后花。`,
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      let account = await manager.findOne(AllowanceAccount, {
        where: { studentId },
      });
      if (!account) {
        account = await manager.save(
          manager.create(AllowanceAccount, { studentId, balanceCents: 0 }),
        );
      }

      if (
        !needsReview &&
        signed < 0 &&
        account.balanceCents + signed < 0
      ) {
        throw new BadRequestException('余额不够啦，先存一点再买');
      }

      const status = needsReview
        ? AllowanceEntryStatus.PENDING
        : AllowanceEntryStatus.POSTED;
      const now = new Date();
      const entry = await manager.save(
        manager.create(AllowanceEntry, {
          studentId,
          accountId: account.id,
          deltaCents: signed,
          kind: dto.kind,
          category: dto.category || this.defaultCategory(dto.kind),
          title: dto.title.trim(),
          note: dto.note?.trim() || null,
          imageUrl: dto.imageUrl
            ? requireSafeUploadPath(dto.imageUrl)
            : null,
          status,
          goalId: null,
          createdBy: user.id,
          reviewedBy: null,
          reviewNote: null,
          postedAt: status === AllowanceEntryStatus.POSTED ? now : null,
        }),
      );

      if (status === AllowanceEntryStatus.POSTED) {
        account.balanceCents += signed;
        if (account.balanceCents < 0) {
          throw new BadRequestException('余额不够啦，先存一点再买');
        }
        await manager.save(account);
      }

      const result = {
        entry: this.entryDto(entry),
        account: this.accountDto(account),
        pending: needsReview,
      };

      if (needsReview) {
        const parentIds = await this.students.getParentIdsOfStudent(studentId);
        this.events.emitToParents(parentIds, 'allowance:pending', {
          studentId,
          entryId: entry.id,
          title: entry.title,
          deltaCents: entry.deltaCents,
        });
      } else if (isParent && INCOME_KINDS.has(dto.kind)) {
        this.events.emitToStudent(studentId, 'allowance:posted', {
          entryId: entry.id,
          title: entry.title,
          deltaCents: entry.deltaCents,
        });
        await this.audit.record({
          actorId: user.id,
          actorName: user.name,
          action: 'allowance.income',
          studentId,
          targetType: 'allowance_entry',
          targetId: entry.id,
          detail: { kind: dto.kind, deltaCents: signed },
        });
      }

      return result;
    });
  }

  async reviewEntry(
    parentId: number,
    entryId: number,
    dto: ReviewAllowanceEntryDto,
    parentName?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const entry = await manager.findOne(AllowanceEntry, {
        where: { id: entryId },
      });
      if (!entry) throw new NotFoundException('流水不存在');
      await this.students.assertBound(parentId, entry.studentId);
      if (entry.status !== AllowanceEntryStatus.PENDING) {
        throw new BadRequestException('这笔已经处理过了');
      }

      if (dto.action === 'reject') {
        const note = (dto.note || '').trim();
        if (!note) {
          throw new BadRequestException('先写一句短评，再缓缓这笔吧');
        }
        entry.status = AllowanceEntryStatus.REJECTED;
        entry.reviewedBy = parentId;
        entry.reviewNote = note;
        await manager.save(entry);
        this.events.emitToStudent(entry.studentId, 'allowance:reviewed', {
          entryId: entry.id,
          action: 'reject',
          note,
          parentName,
        });
        await this.audit.notifyCoParents({
          actorId: parentId,
          actorName: parentName,
          studentId: entry.studentId,
          action: 'allowance.reject',
          message: `缓缓了一笔大额支出：${entry.title}`,
          detail: { entryId: entry.id, note },
        });
        const account = await manager.findOne(AllowanceAccount, {
          where: { id: entry.accountId },
        });
        return {
          entry: this.entryDto(entry),
          account: account ? this.accountDto(account) : null,
        };
      }

      const account = await manager.findOne(AllowanceAccount, {
        where: { id: entry.accountId },
      });
      if (!account) throw new NotFoundException('账户不存在');
      if (account.balanceCents + entry.deltaCents < 0) {
        throw new BadRequestException('余额不够啦，先存一点再买');
      }
      account.balanceCents += entry.deltaCents;
      await manager.save(account);
      entry.status = AllowanceEntryStatus.POSTED;
      entry.postedAt = new Date();
      entry.reviewedBy = parentId;
      entry.reviewNote = dto.note?.trim() || null;
      await manager.save(entry);

      this.events.emitToStudent(entry.studentId, 'allowance:reviewed', {
        entryId: entry.id,
        action: 'approve',
        parentName,
      });
      await this.audit.notifyCoParents({
        actorId: parentId,
        actorName: parentName,
        studentId: entry.studentId,
        action: 'allowance.approve',
        message: `同意了一笔大额支出：${entry.title}`,
        detail: { entryId: entry.id },
      });

      return {
        entry: this.entryDto(entry),
        account: this.accountDto(account),
      };
    });
  }

  async listGoals(studentId: number) {
    await this.assertEnabled(studentId);
    const rows = await this.goals.find({
      where: { studentId },
      order: { id: 'DESC' },
    });
    return rows.map((g) => this.goalDto(g));
  }

  async createGoal(studentId: number, dto: CreateAllowanceGoalDto) {
    await this.assertEnabled(studentId);
    const goal = await this.goals.save(
      this.goals.create({
        studentId,
        title: dto.title.trim(),
        targetCents: dto.targetCents,
        savedCents: 0,
        status: AllowanceGoalStatus.ACTIVE,
        coverUrl: dto.coverUrl
          ? requireSafeUploadPath(dto.coverUrl)
          : null,
      }),
    );
    return this.goalDto(goal);
  }

  async updateGoal(
    studentId: number,
    goalId: number,
    dto: UpdateAllowanceGoalDto,
  ) {
    await this.assertEnabled(studentId);
    const goal = await this.goals.findOne({
      where: { id: goalId, studentId },
    });
    if (!goal) throw new NotFoundException('目标不存在');
    if (goal.status === AllowanceGoalStatus.ACHIEVED) {
      throw new BadRequestException('已经达成的目标不能再改啦');
    }
    if (dto.title !== undefined) goal.title = dto.title.trim();
    if (dto.targetCents !== undefined) {
      if (dto.targetCents < goal.savedCents) {
        throw new BadRequestException('目标金额不能小于已存入的部分');
      }
      goal.targetCents = dto.targetCents;
    }
    if (dto.status === 'cancelled') {
      goal.status = AllowanceGoalStatus.CANCELLED;
    }
    if (dto.coverUrl !== undefined)
      goal.coverUrl = dto.coverUrl
        ? requireSafeUploadPath(dto.coverUrl)
        : null;
    await this.goals.save(goal);
    return this.goalDto(goal);
  }

  async saveToGoal(studentId: number, goalId: number, dto: SaveToGoalDto) {
    await this.assertEnabled(studentId);
    return this.dataSource.transaction(async (manager) => {
      const goal = await manager.findOne(AllowanceGoal, {
        where: { id: goalId, studentId },
      });
      if (!goal || goal.status !== AllowanceGoalStatus.ACTIVE) {
        throw new NotFoundException('目标不存在或已结束');
      }
      const room = goal.targetCents - goal.savedCents;
      if (room <= 0) {
        throw new BadRequestException('这个目标已经存满啦');
      }
      const amount = Math.min(dto.amountCents, room);
      let account = await manager.findOne(AllowanceAccount, {
        where: { studentId },
      });
      if (!account) {
        account = await manager.save(
          manager.create(AllowanceAccount, { studentId, balanceCents: 0 }),
        );
      }
      if (account.balanceCents < amount) {
        throw new BadRequestException('余额不够啦，先存一点再买');
      }

      account.balanceCents -= amount;
      goal.savedCents += amount;
      if (goal.savedCents >= goal.targetCents) {
        goal.status = AllowanceGoalStatus.ACHIEVED;
      }
      await manager.save(account);
      await manager.save(goal);

      const entry = await manager.save(
        manager.create(AllowanceEntry, {
          studentId,
          accountId: account.id,
          deltaCents: -amount,
          kind: AllowanceKind.SAVE,
          category: AllowanceCategory.SAVE,
          title: `存入「${goal.title}」`,
          note: null,
          imageUrl: null,
          status: AllowanceEntryStatus.POSTED,
          goalId: goal.id,
          createdBy: studentId,
          reviewedBy: null,
          reviewNote: null,
          postedAt: new Date(),
        }),
      );

      return {
        goal: this.goalDto(goal),
        entry: this.entryDto(entry),
        account: this.accountDto(account),
        achieved: goal.status === AllowanceGoalStatus.ACHIEVED,
      };
    });
  }

  private async getOrCreateAccount(studentId: number) {
    let account = await this.accounts.findOne({ where: { studentId } });
    if (!account) {
      account = await this.accounts.save(
        this.accounts.create({ studentId, balanceCents: 0 }),
      );
    }
    return account;
  }

  private async assertEnabled(studentId: number) {
    const cfg = await this.family.allowanceConfigForStudent(studentId);
    if (!cfg.allowanceLedgerEnabled) {
      throw new ForbiddenException('家庭还没打开零花钱账本');
    }
  }

  private assertKindAllowed(role: string, kind: AllowanceKind) {
    if (role === UserRole.STUDENT) {
      const ok = [
        AllowanceKind.SPEND,
        AllowanceKind.GIFT_IN,
        AllowanceKind.SAVE,
        AllowanceKind.UNSAVE,
      ].includes(kind);
      if (!ok) {
        throw new ForbiddenException('这类入账请让家长来记');
      }
      if (kind === AllowanceKind.SAVE || kind === AllowanceKind.UNSAVE) {
        throw new BadRequestException('存入目标请用「存入目标」按钮');
      }
    } else {
      const ok = [
        AllowanceKind.POCKET_MONEY,
        AllowanceKind.BONUS,
        AllowanceKind.GIFT_IN,
        AllowanceKind.ADJUST,
        AllowanceKind.SPEND,
      ].includes(kind);
      if (!ok) {
        throw new BadRequestException('家长暂不支持该流水类型');
      }
    }
  }

  private signedDelta(kind: AllowanceKind, amountCents: number): number {
    const abs = Math.abs(amountCents);
    if (
      kind === AllowanceKind.SPEND ||
      kind === AllowanceKind.SAVE
    ) {
      return -abs;
    }
    if (kind === AllowanceKind.ADJUST) {
      // Parent adjust: positive amount = credit; use negative title/note for debit via kind spend preferred
      return abs;
    }
    return abs;
  }

  private defaultCategory(kind: AllowanceKind): AllowanceCategory | null {
    if (kind === AllowanceKind.SAVE) return AllowanceCategory.SAVE;
    if (kind === AllowanceKind.SPEND) return AllowanceCategory.OTHER;
    return null;
  }

  private async weekSpentCents(studentId: number): Promise<number> {
    const start = this.weekStart();
    const rows = await this.entries
      .createQueryBuilder('e')
      .where('e.student_id = :studentId', { studentId })
      .andWhere('e.status = :status', { status: AllowanceEntryStatus.POSTED })
      .andWhere('e.kind = :kind', { kind: AllowanceKind.SPEND })
      .andWhere('e.posted_at >= :start', { start })
      .getMany();
    return rows.reduce((s, e) => s + Math.abs(e.deltaCents), 0);
  }

  private async weekSavedCents(studentId: number): Promise<number> {
    const start = this.weekStart();
    const rows = await this.entries
      .createQueryBuilder('e')
      .where('e.student_id = :studentId', { studentId })
      .andWhere('e.status = :status', { status: AllowanceEntryStatus.POSTED })
      .andWhere('e.kind = :kind', { kind: AllowanceKind.SAVE })
      .andWhere('e.posted_at >= :start', { start })
      .getMany();
    return rows.reduce((s, e) => s + Math.abs(e.deltaCents), 0);
  }

  private weekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + mondayOffset);
    return start;
  }

  private accountDto(a: AllowanceAccount) {
    return {
      id: a.id,
      studentId: a.studentId,
      balanceCents: a.balanceCents,
      updatedAt: a.updatedAt,
    };
  }

  private entryDto(e: AllowanceEntry) {
    return {
      id: e.id,
      studentId: e.studentId,
      accountId: e.accountId,
      deltaCents: e.deltaCents,
      kind: e.kind,
      category: e.category,
      title: e.title,
      note: e.note,
      imageUrl: e.imageUrl,
      status: e.status,
      goalId: e.goalId,
      createdBy: e.createdBy,
      reviewedBy: e.reviewedBy,
      reviewNote: e.reviewNote,
      createdAt: e.createdAt,
      postedAt: e.postedAt,
      refType: e.refType || null,
      refId: e.refId ?? null,
    };
  }

  private goalDto(g: AllowanceGoal) {
    return {
      id: g.id,
      studentId: g.studentId,
      title: g.title,
      targetCents: g.targetCents,
      savedCents: g.savedCents,
      status: g.status,
      coverUrl: g.coverUrl,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  private claimDto(c: AchievementClaim) {
    return {
      id: c.id,
      familyId: c.familyId,
      studentUserId: c.studentUserId,
      title: c.title,
      note: c.note,
      amountCents: c.amountCents,
      status: c.status,
      postedLedgerId: c.postedLedgerId,
      createdBy: c.createdBy,
      postedBy: c.postedBy,
      createdAt: c.createdAt,
      postedAt: c.postedAt,
    };
  }

  /** V1.5：家长登记成就奖金（draft） */
  async createAchievement(
    parentId: number,
    dto: CreateAchievementClaimDto,
  ) {
    await this.students.assertBound(parentId, dto.studentId);
    await this.assertEnabled(dto.studentId);
    const cfg = await this.family.allowanceConfigForStudent(dto.studentId);
    if (!cfg.allowanceAchievementBonusEnabled) {
      throw new ForbiddenException('未开启成就奖金');
    }
    const max = cfg.allowanceAchievementBonusMaxCents || 20000;
    if (dto.amountCents > max) {
      throw new BadRequestException(
        `单笔成就奖金不能超过 ${(max / 100).toFixed(2)} 元`,
      );
    }
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('请填写成就标题');
    const claim = await this.claims.save(
      this.claims.create({
        familyId: parentId,
        studentUserId: dto.studentId,
        title,
        note: dto.note?.trim() || null,
        amountCents: dto.amountCents,
        status: 'draft',
        postedLedgerId: null,
        createdBy: parentId,
        postedBy: null,
        postedAt: null,
      }),
    );
    return this.claimDto(claim);
  }

  async postAchievement(parentId: number, claimId: number) {
    const claim = await this.claims.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('找不到这条成就登记');
    await this.students.assertBound(parentId, claim.studentUserId);
    if (claim.status !== 'draft') {
      throw new BadRequestException('只能确认草稿状态的成就奖金');
    }
    await this.assertEnabled(claim.studentUserId);
    const cfg = await this.family.allowanceConfigForStudent(claim.studentUserId);
    if (!cfg.allowanceAchievementBonusEnabled) {
      throw new ForbiddenException('未开启成就奖金');
    }

    return this.dataSource.transaction(async (manager) => {
      let account = await manager.findOne(AllowanceAccount, {
        where: { studentId: claim.studentUserId },
      });
      if (!account) {
        account = await manager.save(
          manager.create(AllowanceAccount, {
            studentId: claim.studentUserId,
            balanceCents: 0,
          }),
        );
      }
      const now = new Date();
      const entry = await manager.save(
        manager.create(AllowanceEntry, {
          studentId: claim.studentUserId,
          accountId: account.id,
          deltaCents: claim.amountCents,
          kind: AllowanceKind.BONUS,
          category: null,
          title: `成就奖金 · ${claim.title}`.slice(0, 80),
          note: claim.note,
          imageUrl: null,
          status: AllowanceEntryStatus.POSTED,
          goalId: null,
          createdBy: parentId,
          reviewedBy: parentId,
          reviewNote: null,
          postedAt: now,
          refType: 'achievement_claim',
          refId: claim.id,
        }),
      );
      account.balanceCents += claim.amountCents;
      await manager.save(account);
      claim.status = 'posted';
      claim.postedBy = parentId;
      claim.postedAt = now;
      claim.postedLedgerId = entry.id;
      await manager.save(claim);

      await this.audit.record({
        actorId: parentId,
        action: 'allowance.achievement_post',
        studentId: claim.studentUserId,
        targetType: 'achievement_claim',
        targetId: claim.id,
        detail: { amountCents: claim.amountCents },
      });

      return {
        claim: this.claimDto(claim),
        entry: this.entryDto(entry),
        account: this.accountDto(account),
      };
    });
  }

  async cancelAchievement(parentId: number, claimId: number) {
    const claim = await this.claims.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('找不到这条成就登记');
    await this.students.assertBound(parentId, claim.studentUserId);
    if (claim.status !== 'draft') {
      throw new BadRequestException('只能取消草稿');
    }
    claim.status = 'cancelled';
    await this.claims.save(claim);
    return this.claimDto(claim);
  }

  async listAchievements(user: { id: number; role: string }, studentId?: number) {
    if (user.role === UserRole.STUDENT) {
      const rows = await this.claims.find({
        where: { studentUserId: user.id },
        order: { id: 'DESC' },
        take: 50,
      });
      return rows.map((c) => this.claimDto(c));
    }
    const sid = studentId;
    if (!sid) throw new BadRequestException('请选择孩子');
    await this.students.assertBound(user.id, sid);
    const rows = await this.claims.find({
      where: { studentUserId: sid },
      order: { id: 'DESC' },
      take: 50,
    });
    return rows.map((c) => this.claimDto(c));
  }
}
