import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PointPact } from '../entities/point-pact.entity';
import { User } from '../entities/user.entity';
import {
  PointPactStatus,
  PointReason,
  UserRole,
} from '../common/enums';
import { addShanghaiDays, todayStr } from '../common/date-util';
import { FamilyService } from '../family/family.service';
import { PactPolicyReader } from '../family/pact-policy.reader';
import { StudentsService } from '../students/students.service';
import { EventsGateway } from '../events/events.gateway';
import { PushService } from '../push/push.service';
import { CreatePointPactDto } from './dto';
import {
  targetOverdueExtra,
  shanghaiDayDiff,
  needsParentGate,
  isPactOnTime,
  displayOverdueExtra,
} from './pact-math';
import { PointsLedgerService } from '../points/points-ledger.service';

const OPEN_STATUSES = [
  PointPactStatus.PARENT_PENDING,
  PointPactStatus.PENDING,
  PointPactStatus.ACTIVE,
];

@Injectable()
export class PactsService {
  constructor(
    @InjectRepository(PointPact) private readonly pacts: Repository<PointPact>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly family: FamilyService,
    private readonly pactPolicy: PactPolicyReader,
    private readonly students: StudentsService,
    private readonly ledger: PointsLedgerService,
    @Optional() private readonly events?: EventsGateway,
    @Optional() private readonly push?: PushService,
  ) {}

  async configForStudent(studentId: number) {
    return this.pactPolicy.forStudent(studentId);
  }

  /** 今日页 / softNudge 用 */
  async hintsForStudent(studentId: number) {
    const cfg = await this.pactPolicy.forStudent(studentId);
    const empty = {
      enabled: false,
      dueSoon: 0,
      overdue: 0,
      awaitMyAccept: 0,
      awaitParent: 0,
      openCount: 0,
      summary: '',
      focus: null as null | 'due' | 'accept' | 'parent',
    };
    if (!cfg.pointsPactEnabled) return empty;

    const rows = await this.pacts.find({
      where: [
        { lenderId: studentId, status: In(OPEN_STATUSES) },
        { borrowerId: studentId, status: In(OPEN_STATUSES) },
      ],
    });
    const seen = new Set<number>();
    const unique = rows.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const today = todayStr();
    const tomorrow = addShanghaiDays(today, 1);
    let dueSoon = 0;
    let overdue = 0;
    let awaitMyAccept = 0;
    let awaitParent = 0;

    for (const p of unique) {
      if (
        p.status === PointPactStatus.PARENT_PENDING &&
        p.borrowerId === studentId
      ) {
        awaitParent++;
      }
      if (p.status === PointPactStatus.PENDING && p.lenderId === studentId) {
        awaitMyAccept++;
      }
      if (p.status === PointPactStatus.ACTIVE && p.borrowerId === studentId) {
        if (p.dueDate < today) overdue++;
        else if (p.dueDate === today || p.dueDate === tomorrow) dueSoon++;
      }
    }

    let summary = '';
    let focus: null | 'due' | 'accept' | 'parent' = null;
    if (overdue) {
      summary = `有 ${overdue} 份约定已过还回日，记得按约定还回积分`;
      focus = 'due';
    } else if (awaitMyAccept) {
      summary = `有 ${awaitMyAccept} 份约定待你确认是否借出积分`;
      focus = 'accept';
    } else if (awaitParent) {
      summary = `有 ${awaitParent} 份大额约定在等家长看一眼`;
      focus = 'parent';
    } else if (dueSoon) {
      summary = `有 ${dueSoon} 份约定今天或明天要还回积分`;
      focus = 'due';
    }

    return {
      enabled: true,
      dueSoon,
      overdue,
      awaitMyAccept,
      awaitParent,
      openCount: unique.length,
      summary,
      focus,
    };
  }

  /** 家长看板告警计数 */
  async alertForParent(parentId: number) {
    const settings = await this.family.getOrCreate(parentId);
    if (!settings.pointsPactEnabled) {
      return { parentPending: 0, overdue: 0, total: 0 };
    }
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) {
      return { parentPending: 0, overdue: 0, total: 0 };
    }
    const rows = await this.pacts.find({
      where: [
        { lenderId: In(studentIds), status: In(OPEN_STATUSES) },
        { borrowerId: In(studentIds), status: In(OPEN_STATUSES) },
      ],
    });
    const seen = new Set<number>();
    const today = todayStr();
    let parentPending = 0;
    let overdue = 0;
    for (const p of rows) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (p.status === PointPactStatus.PARENT_PENDING) parentPending++;
      if (p.status === PointPactStatus.ACTIVE && p.dueDate < today) overdue++;
    }
    return {
      parentPending,
      overdue,
      total: parentPending + overdue,
    };
  }

  async listSiblings(studentId: number) {
    const cfg = await this.pactPolicy.forStudent(studentId);
    if (!cfg.pointsPactEnabled) {
      return { enabled: false, siblings: [], config: cfg };
    }
    const parentIds = await this.students.getParentIdsOfStudent(studentId);
    const siblingIds = new Set<number>();
    for (const pid of parentIds) {
      for (const sid of await this.students.getStudentIdsOfParent(pid)) {
        if (sid !== studentId) siblingIds.add(sid);
      }
    }
    if (!siblingIds.size) {
      return { enabled: true, siblings: [], config: cfg };
    }
    const rows = await this.users.find({
      where: { id: In([...siblingIds]), role: UserRole.STUDENT },
      order: { id: 'ASC' },
    });
    return {
      enabled: true,
      siblings: rows.map((u) => ({
        id: u.id,
        name: u.name,
        pointsBalance: u.pointsBalance,
      })),
      config: cfg,
    };
  }

  async listForStudent(studentId: number) {
    const cfg = await this.pactPolicy.forStudent(studentId);
    if (!cfg.pointsPactEnabled) {
      return { enabled: false, items: [], config: cfg };
    }
    const rows = await this.pacts.find({
      where: [{ lenderId: studentId }, { borrowerId: studentId }],
      relations: ['lender', 'borrower'],
      order: { id: 'DESC' },
      take: 50,
    });
    const items: Awaited<ReturnType<PactsService['toDto']>>[] = [];
    for (const row of rows) {
      items.push(await this.toDto(row, cfg.pointsPactMaxOverdueExtra));
    }
    return { enabled: true, items, config: cfg };
  }

  async listForParent(parentId: number) {
    const settings = await this.family.getOrCreate(parentId);
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) {
      return { enabled: !!settings.pointsPactEnabled, items: [], config: settings };
    }
    const rows = await this.pacts.find({
      where: [
        { lenderId: In(studentIds) },
        { borrowerId: In(studentIds) },
      ],
      relations: ['lender', 'borrower'],
      order: { id: 'DESC' },
      take: 80,
    });
    const seen = new Set<number>();
    const items: Awaited<ReturnType<PactsService['toDto']>>[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      items.push(
        await this.toDto(row, settings.pointsPactMaxOverdueExtra ?? 30),
      );
    }
    return {
      enabled: !!settings.pointsPactEnabled,
      items,
      config: settings,
    };
  }

  async create(borrowerId: number, dto: CreatePointPactDto) {
    const cfg = await this.requireEnabled(borrowerId);
    if (dto.lenderId === borrowerId) {
      throw new BadRequestException('不能向自己发起积分约定');
    }
    await this.assertSiblings(borrowerId, dto.lenderId);
    if (dto.amountPoints > cfg.pointsPactMaxAmount) {
      throw new BadRequestException(
        `单笔最多借用 ${cfg.pointsPactMaxAmount} 积分`,
      );
    }
    const today = todayStr();
    if (dto.dueDate < today) {
      throw new BadRequestException('约定还回日不能早于今天');
    }
    await this.assertActiveLimit(borrowerId, cfg.pointsPactMaxActive);
    await this.assertActiveLimit(dto.lenderId, cfg.pointsPactMaxActive);

    const lender = await this.users.findOne({ where: { id: dto.lenderId } });
    if (!lender || lender.role !== UserRole.STUDENT) {
      throw new NotFoundException('借出方不存在');
    }

    const approveAbove = cfg.pointsPactParentApproveAbove ?? 0;
    const needsParent = needsParentGate(dto.amountPoints, approveAbove);
    const status = needsParent
      ? PointPactStatus.PARENT_PENDING
      : PointPactStatus.PENDING;

    const row = await this.pacts.save(
      this.pacts.create({
        lenderId: dto.lenderId,
        borrowerId,
        amountPoints: dto.amountPoints,
        dueDate: dto.dueDate,
        status,
        note: dto.note?.trim() || null,
        overdueExtraAccrued: 0,
        overdueExtraPaid: 0,
        lastAccrualDate: null,
      }),
    );
    const dtoOut = await this.toDto(
      await this.load(row.id),
      cfg.pointsPactMaxOverdueExtra,
    );

    if (needsParent) {
      const parentIds = await this.students.getParentIdsOfStudent(borrowerId);
      this.notifyParents(
        parentIds,
        'pact:parent_pending',
        {
          message: `${dtoOut.borrowerName || '孩子'}想借用 ${dto.amountPoints} 积分，请先看一眼`,
          pactId: row.id,
        },
        '/parent/pacts',
      );
    } else {
      this.notifyStudent(
        dto.lenderId,
        'pact:pending',
        {
          message: `${dtoOut.borrowerName || '家人'}想向你借用 ${dto.amountPoints} 积分`,
          pactId: row.id,
        },
        '/student/pacts',
      );
    }

    return dtoOut;
  }

  async accept(lenderId: number, pactId: number) {
    const cfg = await this.requireEnabled(lenderId);
    const pact = await this.load(pactId);
    if (pact.lenderId !== lenderId) {
      throw new ForbiddenException('只有借出方可以同意这份约定');
    }
    if (pact.status !== PointPactStatus.PENDING) {
      throw new BadRequestException(
        pact.status === PointPactStatus.PARENT_PENDING
          ? '还在等家长先同意'
          : '这份约定已处理过了',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const note = `积分约定#${pact.id}`;
      await this.ledger.transfer(manager, {
        fromId: pact.lenderId,
        toId: pact.borrowerId,
        amount: pact.amountPoints,
        reasonOut: PointReason.PACT_OUT,
        reasonIn: PointReason.PACT_IN,
        refId: pact.id,
        noteOut: `${note}·借出`,
        noteIn: `${note}·借用`,
        enforceBalance: true,
        insufficientMessage: `你的积分不够借出（需要 ${pact.amountPoints} 积分）`,
      });
      pact.status = PointPactStatus.ACTIVE;
      pact.confirmedAt = new Date();
      pact.lastAccrualDate = todayStr();
      await manager.save(pact);
    });

    const out = await this.toDto(
      await this.load(pactId),
      cfg.pointsPactMaxOverdueExtra,
    );
    this.notifyStudent(
      pact.borrowerId,
      'pact:accepted',
      {
        message: `${out.lenderName || '对方'}已同意借出 ${pact.amountPoints} 积分`,
        pactId,
      },
      '/student/pacts',
    );
    return out;
  }

  async reject(lenderId: number, pactId: number) {
    const cfg = await this.requireEnabled(lenderId);
    const pact = await this.load(pactId);
    if (pact.lenderId !== lenderId) {
      throw new ForbiddenException('只有借出方可以婉拒这份约定');
    }
    if (pact.status !== PointPactStatus.PENDING) {
      throw new BadRequestException('这份约定已处理过了');
    }
    pact.status = PointPactStatus.CANCELLED;
    await this.pacts.save(pact);
    this.notifyStudent(
      pact.borrowerId,
      'pact:rejected',
      {
        message: `${pact.lender?.name || '对方'}婉拒了这次积分约定`,
        pactId,
      },
      '/student/pacts',
    );
    return this.toDto(await this.load(pactId), cfg.pointsPactMaxOverdueExtra);
  }

  async cancel(studentId: number, pactId: number) {
    const cfg = await this.requireEnabled(studentId);
    const pact = await this.load(pactId);
    if (pact.borrowerId !== studentId && pact.lenderId !== studentId) {
      throw new ForbiddenException('这不是你的约定');
    }
    if (
      pact.status !== PointPactStatus.PENDING &&
      pact.status !== PointPactStatus.PARENT_PENDING
    ) {
      throw new BadRequestException('只能取消尚未生效的约定');
    }
    // 借出方不能取消 parent_pending（那是借用方发起的）
    if (
      pact.status === PointPactStatus.PARENT_PENDING &&
      pact.borrowerId !== studentId
    ) {
      throw new ForbiddenException('只有发起方可以取消待家长同意的约定');
    }
    pact.status = PointPactStatus.CANCELLED;
    await this.pacts.save(pact);
    return this.toDto(await this.load(pactId), cfg.pointsPactMaxOverdueExtra);
  }

  async repay(borrowerId: number, pactId: number) {
    const cfg = await this.requireEnabled(borrowerId);
    let pact = await this.load(pactId);
    if (pact.borrowerId !== borrowerId) {
      throw new ForbiddenException('只有借用方可以还回积分');
    }
    if (pact.status !== PointPactStatus.ACTIVE) {
      throw new BadRequestException('这份约定当前不能还回');
    }
    pact = await this.accrue(pact, cfg.pointsPactMaxOverdueExtra);
    const extraDue = pact.overdueExtraAccrued - pact.overdueExtraPaid;
    const total = pact.amountPoints + extraDue;
    const today = todayStr();
    const onTime = isPactOnTime(pact.dueDate, extraDue, today);

    let borrowerBalance = 0;
    await this.dataSource.transaction(async (manager) => {
      const borrower = await manager.findOne(User, {
        where: { id: pact.borrowerId },
      });
      if (!borrower) throw new NotFoundException('学生不存在');
      if ((borrower.pointsBalance || 0) < total) {
        throw new BadRequestException(
          `积分不够还回（需要 ${total} 积分：约定 ${pact.amountPoints}` +
            (extraDue ? ` + 逾期补分 ${extraDue}` : '') +
            '）',
        );
      }
      const note = `积分约定#${pact.id}`;
      const principal = await this.ledger.transfer(manager, {
        fromId: pact.borrowerId,
        toId: pact.lenderId,
        amount: pact.amountPoints,
        reasonOut: PointReason.PACT_RETURN,
        reasonIn: PointReason.PACT_RETURN,
        refId: pact.id,
        noteOut: `${note}·还回`,
        noteIn: `${note}·收回`,
        enforceBalance: true,
      });
      borrowerBalance = principal.fromBalance;
      if (extraDue > 0) {
        const overdue = await this.ledger.transfer(manager, {
          fromId: pact.borrowerId,
          toId: pact.lenderId,
          amount: extraDue,
          reasonOut: PointReason.PACT_OVERDUE,
          reasonIn: PointReason.PACT_OVERDUE,
          refId: pact.id,
          noteOut: `${note}·逾期补分`,
          noteIn: `${note}·逾期补分`,
          enforceBalance: true,
        });
        borrowerBalance = overdue.fromBalance;
      }
      const fresh = await manager.findOne(PointPact, { where: { id: pact.id } });
      if (!fresh) throw new NotFoundException('约定不存在');
      fresh.overdueExtraAccrued = pact.overdueExtraAccrued;
      fresh.overdueExtraPaid = pact.overdueExtraAccrued;
      fresh.lastAccrualDate = pact.lastAccrualDate;
      fresh.status = PointPactStatus.REPAID;
      fresh.repaidAt = new Date();
      await manager.save(fresh);
    });

    const out = await this.toDto(
      await this.load(pactId),
      cfg.pointsPactMaxOverdueExtra,
    );
    const message = onTime
      ? '说到做到！积分已按约定还回。'
      : `已还清。约定外多还了 ${extraDue} 积分（逾期补分）。`;

    this.notifyStudent(
      pact.lenderId,
      'pact:repaid',
      {
        message: onTime
          ? `${out.borrowerName || '对方'}已按约定还回积分，说到做到`
          : `${out.borrowerName || '对方'}已还回积分`,
        pactId,
      },
      '/student/pacts',
    );

    return {
      ...out,
      onTime,
      message,
      pointsBalance: borrowerBalance,
    };
  }

  async parentApprove(parentId: number, pactId: number) {
    await this.assertParentSeesPact(parentId, pactId);
    const settings = await this.family.getOrCreate(parentId);
    const pact = await this.load(pactId);
    if (pact.status !== PointPactStatus.PARENT_PENDING) {
      throw new BadRequestException('这份约定不在待家长同意状态');
    }
    pact.status = PointPactStatus.PENDING;
    await this.pacts.save(pact);
    const out = await this.toDto(
      await this.load(pactId),
      settings.pointsPactMaxOverdueExtra ?? 30,
    );
    this.notifyStudent(
      pact.lenderId,
      'pact:pending',
      {
        message: `家长已同意，${out.borrowerName || '家人'}想向你借用 ${pact.amountPoints} 积分，请确认`,
        pactId,
      },
      '/student/pacts',
    );
    this.notifyStudent(
      pact.borrowerId,
      'pact:parent_approved',
      {
        message: '家长已同意，正在等对方确认是否借出',
        pactId,
      },
      '/student/pacts',
    );
    return out;
  }

  async parentReject(parentId: number, pactId: number) {
    await this.assertParentSeesPact(parentId, pactId);
    const settings = await this.family.getOrCreate(parentId);
    const pact = await this.load(pactId);
    if (pact.status !== PointPactStatus.PARENT_PENDING) {
      throw new BadRequestException('这份约定不在待家长同意状态');
    }
    pact.status = PointPactStatus.CANCELLED;
    await this.pacts.save(pact);
    this.notifyStudent(
      pact.borrowerId,
      'pact:parent_rejected',
      {
        message: '家长婉拒了这次大额积分约定',
        pactId,
      },
      '/student/pacts',
    );
    return this.toDto(
      await this.load(pactId),
      settings.pointsPactMaxOverdueExtra ?? 30,
    );
  }

  async parentCancel(parentId: number, pactId: number) {
    await this.assertParentSeesPact(parentId, pactId);
    const settings = await this.family.getOrCreate(parentId);
    const pact = await this.load(pactId);
    if (
      pact.status !== PointPactStatus.PENDING &&
      pact.status !== PointPactStatus.PARENT_PENDING
    ) {
      throw new BadRequestException('只能取消尚未生效的约定');
    }
    pact.status = PointPactStatus.CANCELLED;
    await this.pacts.save(pact);
    return this.toDto(
      await this.load(pactId),
      settings.pointsPactMaxOverdueExtra ?? 30,
    );
  }

  async parentForceRepay(parentId: number, pactId: number) {
    await this.assertParentSeesPact(parentId, pactId);
    const pact = await this.load(pactId);
    return this.repay(pact.borrowerId, pactId);
  }

  async parentWriteOff(parentId: number, pactId: number, note?: string) {
    await this.assertParentSeesPact(parentId, pactId);
    const settings = await this.family.getOrCreate(parentId);
    let pact = await this.load(pactId);
    if (pact.status !== PointPactStatus.ACTIVE) {
      throw new BadRequestException('只能结束进行中的约定');
    }
    pact = await this.accrue(pact, settings.pointsPactMaxOverdueExtra ?? 30);
    pact.status = PointPactStatus.WRITTEN_OFF;
    if (note?.trim()) {
      pact.note = [pact.note, `家长结束：${note.trim()}`]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 120);
    }
    await this.pacts.save(pact);
    return this.toDto(
      await this.load(pactId),
      settings.pointsPactMaxOverdueExtra ?? 30,
    );
  }

  private notifyStudent(
    studentId: number,
    event: string,
    payload: { message: string; pactId: number },
    url: string,
  ) {
    const data = { ...payload, at: new Date().toISOString() };
    this.events?.emitToStudent(studentId, event, data);
    void this.push?.sendToUser(studentId, {
      title: '积分约定',
      body: payload.message.slice(0, 80),
      url,
      tag: `pact-${payload.pactId}`,
    });
  }

  private notifyParents(
    parentIds: number[],
    event: string,
    payload: { message: string; pactId: number },
    url: string,
  ) {
    if (!parentIds.length) return;
    const data = { ...payload, at: new Date().toISOString() };
    this.events?.emitToParents(parentIds, event, data);
    for (const pid of parentIds) {
      void this.push?.sendToUser(pid, {
        title: '积分约定',
        body: payload.message.slice(0, 80),
        url,
        tag: `pact-${payload.pactId}`,
      });
    }
  }

  /** 打开详情时持久化计提（列表只读不算写） */
  async getOneForStudent(studentId: number, pactId: number) {
    const cfg = await this.requireEnabled(studentId);
    let pact = await this.load(pactId);
    if (pact.borrowerId !== studentId && pact.lenderId !== studentId) {
      throw new ForbiddenException('这不是你的约定');
    }
    if (pact.status === PointPactStatus.ACTIVE) {
      pact = await this.accrue(pact, cfg.pointsPactMaxOverdueExtra);
    }
    return this.toDto(pact, cfg.pointsPactMaxOverdueExtra);
  }

  async getOneForParent(parentId: number, pactId: number) {
    const pact = await this.load(pactId);
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (!ids.includes(pact.borrowerId) && !ids.includes(pact.lenderId)) {
      throw new ForbiddenException('无权查看这份约定');
    }
    const settings = await this.family.getOrCreate(parentId);
    let row = pact;
    if (row.status === PointPactStatus.ACTIVE) {
      row = await this.accrue(row, settings.pointsPactMaxOverdueExtra ?? 30);
    }
    return this.toDto(row, settings.pointsPactMaxOverdueExtra ?? 30);
  }

  private async accrue(pact: PointPact, maxExtra: number) {
    if (pact.status !== PointPactStatus.ACTIVE) return pact;
    const today = todayStr();
    const target = targetOverdueExtra(pact.dueDate, maxExtra, today);
    if (target > pact.overdueExtraAccrued) {
      pact.overdueExtraAccrued = target;
      pact.lastAccrualDate = today;
      await this.pacts.save(pact);
    } else if (pact.lastAccrualDate !== today) {
      pact.lastAccrualDate = today;
      await this.pacts.save(pact);
    }
    return pact;
  }

  /** 列表/响应：只读计算应还金额，不写库 */
  private async toDto(pact: PointPact, maxExtra: number) {
    if (
      pact.status === PointPactStatus.ACTIVE &&
      (!pact.lender || !pact.borrower)
    ) {
      pact = await this.load(pact.id);
    }
    const today = todayStr();
    const overdueDays =
      pact.status === PointPactStatus.ACTIVE
        ? shanghaiDayDiff(pact.dueDate, today)
        : 0;
    const { displayAccrued, extraDue } =
      pact.status === PointPactStatus.ACTIVE
        ? displayOverdueExtra(
            pact.dueDate,
            pact.overdueExtraAccrued,
            pact.overdueExtraPaid,
            maxExtra,
            today,
          )
        : {
            displayAccrued: pact.overdueExtraAccrued,
            extraDue: Math.max(
              0,
              pact.overdueExtraAccrued - pact.overdueExtraPaid,
            ),
          };
    const amountDue =
      pact.status === PointPactStatus.ACTIVE
        ? pact.amountPoints + extraDue
        : 0;
    return {
      id: pact.id,
      lenderId: pact.lenderId,
      lenderName: pact.lender?.name,
      borrowerId: pact.borrowerId,
      borrowerName: pact.borrower?.name,
      amountPoints: pact.amountPoints,
      dueDate: pact.dueDate,
      status: pact.status,
      overdueExtraAccrued: displayAccrued,
      overdueExtraPaid: pact.overdueExtraPaid,
      overdueExtraDue: extraDue,
      overdueDays,
      amountDue,
      maxOverdueExtra: maxExtra,
      note: pact.note,
      confirmedAt: pact.confirmedAt,
      repaidAt: pact.repaidAt,
      createdAt: pact.createdAt,
    };
  }

  private async load(id: number) {
    const row = await this.pacts.findOne({
      where: { id },
      relations: ['lender', 'borrower'],
    });
    if (!row) throw new NotFoundException('约定不存在');
    return row;
  }

  private async requireEnabled(studentId: number) {
    const cfg = await this.pactPolicy.forStudent(studentId);
    if (!cfg.pointsPactEnabled) {
      throw new ForbiddenException(
        '家庭暂未开启积分约定（请家长在「休息与约定」里打开）',
      );
    }
    return cfg;
  }

  private async assertSiblings(a: number, b: number) {
    const parentsA = await this.students.getParentIdsOfStudent(a);
    const parentsB = new Set(await this.students.getParentIdsOfStudent(b));
    if (!parentsA.some((p) => parentsB.has(p))) {
      throw new ForbiddenException('只能和同一家庭的兄弟姐妹发起积分约定');
    }
  }

  private async assertActiveLimit(studentId: number, maxActive: number) {
    const qbCount = await this.pacts
      .createQueryBuilder('p')
      .where('p.status IN (:...st)', { st: OPEN_STATUSES })
      .andWhere('(p.lenderId = :sid OR p.borrowerId = :sid)', {
        sid: studentId,
      })
      .getCount();
    if (qbCount >= maxActive) {
      throw new BadRequestException(
        `未结清的积分约定已达上限（${maxActive} 份）`,
      );
    }
  }

  private async assertParentSeesPact(parentId: number, pactId: number) {
    const pact = await this.load(pactId);
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (!ids.includes(pact.lenderId) || !ids.includes(pact.borrowerId)) {
      throw new ForbiddenException('看不到这份约定');
    }
    return pact;
  }
}
