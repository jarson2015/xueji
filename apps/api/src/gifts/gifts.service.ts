import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';
import { PointGift } from '../entities/point-gift.entity';
import { User } from '../entities/user.entity';
import {
  PointGiftStatus,
  PointReason,
  UserRole,
} from '../common/enums';
import { todayStr } from '../common/date-util';
import { FamilyService } from '../family/family.service';
import { FamilyPolicyReader } from '../family/family-policy.reader';
import { StudentsService } from '../students/students.service';
import { EventsGateway } from '../events/events.gateway';
import { PushService } from '../push/push.service';
import { PointsLedgerService } from '../points/points-ledger.service';
import { CreatePointGiftDto } from './dto';
import {
  giftNoteOk,
  needsParentGate,
  shanghaiWeekEnd,
  shanghaiWeekStart,
} from './gift-math';

const OPEN_STATUSES = [
  PointGiftStatus.PARENT_PENDING,
  PointGiftStatus.PENDING,
];

@Injectable()
export class GiftsService {
  constructor(
    @InjectRepository(PointGift) private readonly gifts: Repository<PointGift>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly family: FamilyService,
    private readonly policy: FamilyPolicyReader,
    private readonly students: StudentsService,
    private readonly ledger: PointsLedgerService,
    @Optional() private readonly events?: EventsGateway,
    @Optional() private readonly push?: PushService,
  ) {}

  async listSiblings(studentId: number) {
    const bundle = await this.policy.loadOne(studentId);
    const enabled = !!bundle.pointsPact.pointsPactEnabled;
    if (!enabled) {
      return {
        enabled: false,
        siblings: [],
        config: this.configDto(bundle),
      };
    }
    const parentIds = await this.students.getParentIdsOfStudent(studentId);
    const siblingIds = new Set<number>();
    for (const pid of parentIds) {
      for (const sid of await this.students.getStudentIdsOfParent(pid)) {
        if (sid !== studentId) siblingIds.add(sid);
      }
    }
    if (!siblingIds.size) {
      return { enabled: true, siblings: [], config: this.configDto(bundle) };
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
      config: this.configDto(bundle),
    };
  }

  async listForStudent(studentId: number) {
    const bundle = await this.policy.loadOne(studentId);
    const enabled = !!bundle.pointsPact.pointsPactEnabled;
    if (!enabled) {
      return { enabled: false, items: [], config: this.configDto(bundle) };
    }
    const rows = await this.gifts.find({
      where: [{ fromStudentId: studentId }, { toStudentId: studentId }],
      relations: ['fromStudent', 'toStudent'],
      order: { id: 'DESC' },
      take: 50,
    });
    return {
      enabled: true,
      items: rows.map((r) => this.toDto(r)),
      config: this.configDto(bundle),
    };
  }

  async listForParent(parentId: number) {
    const settings = await this.family.getOrCreate(parentId);
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) {
      return {
        enabled: !!settings.pointsPactEnabled,
        items: [],
        config: this.settingsGiftConfig(settings),
      };
    }
    const rows = await this.gifts.find({
      where: [
        { fromStudentId: In(studentIds) },
        { toStudentId: In(studentIds) },
      ],
      relations: ['fromStudent', 'toStudent'],
      order: { id: 'DESC' },
      take: 80,
    });
    const seen = new Set<number>();
    const items: ReturnType<GiftsService['toDto']>[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      items.push(this.toDto(row));
    }
    return {
      enabled: !!settings.pointsPactEnabled,
      items,
      config: this.settingsGiftConfig(settings),
    };
  }

  async getOneForStudent(studentId: number, giftId: number) {
    await this.requireEnabled(studentId);
    const gift = await this.load(giftId);
    if (gift.fromStudentId !== studentId && gift.toStudentId !== studentId) {
      throw new ForbiddenException('这不是你的赠予');
    }
    return this.toDto(gift);
  }

  async getOneForParent(parentId: number, giftId: number) {
    const gift = await this.load(giftId);
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (
      !ids.includes(gift.fromStudentId) &&
      !ids.includes(gift.toStudentId)
    ) {
      throw new ForbiddenException('无权查看这份赠予');
    }
    return this.toDto(gift);
  }

  async create(fromStudentId: number, dto: CreatePointGiftDto) {
    const cfg = await this.requireEnabled(fromStudentId);
    if (dto.toStudentId === fromStudentId) {
      throw new BadRequestException('不能送给自己');
    }
    await this.assertSiblings(fromStudentId, dto.toStudentId);
    await this.assertNotYoung(fromStudentId, dto.toStudentId);

    if (!giftNoteOk(dto.reasonCode, dto.note)) {
      throw new BadRequestException('选择「其他心意」时请写至少两个字说明');
    }
    if (dto.amountPoints > cfg.pointsGiftMaxAmount) {
      throw new BadRequestException(
        `单笔最多赠予 ${cfg.pointsGiftMaxAmount} 积分`,
      );
    }

    await this.assertDailyLimit(fromStudentId, cfg.pointsGiftDailyMax);
    await this.assertWeeklyOutRoom(
      fromStudentId,
      dto.amountPoints,
      cfg.pointsGiftWeeklyOutMax,
    );

    const toUser = await this.users.findOne({ where: { id: dto.toStudentId } });
    if (!toUser || toUser.role !== UserRole.STUDENT) {
      throw new NotFoundException('接收方不存在');
    }

    const needsParent = needsParentGate(
      dto.amountPoints,
      cfg.pointsGiftParentApproveAbove,
    );
    const status = needsParent
      ? PointGiftStatus.PARENT_PENDING
      : PointGiftStatus.PENDING;

    const row = await this.gifts.save(
      this.gifts.create({
        fromStudentId,
        toStudentId: dto.toStudentId,
        amountPoints: dto.amountPoints,
        status,
        reasonCode: dto.reasonCode,
        note: dto.note?.trim() || null,
        parentDecidedAt: null,
        acceptedAt: null,
      }),
    );
    const out = this.toDto(await this.load(row.id));

    if (needsParent) {
      const parentIds =
        await this.students.getParentIdsOfStudent(fromStudentId);
      this.notifyParents(
        parentIds,
        'gift:parent_pending',
        {
          message: `${out.fromName || '孩子'}想赠予 ${dto.amountPoints} 积分给家人，请先看一眼`,
          giftId: row.id,
        },
        '/parent/pacts',
      );
    } else {
      this.notifyStudent(
        dto.toStudentId,
        'gift:pending',
        {
          message: `${out.fromName || '家人'}想赠予你 ${dto.amountPoints} 积分`,
          giftId: row.id,
        },
        '/student/pacts',
      );
    }

    return out;
  }

  async accept(toStudentId: number, giftId: number) {
    await this.requireEnabled(toStudentId);
    const gift = await this.load(giftId);
    if (gift.toStudentId !== toStudentId) {
      throw new ForbiddenException('只有接收方可以收下');
    }
    if (gift.status !== PointGiftStatus.PENDING) {
      throw new BadRequestException(
        gift.status === PointGiftStatus.PARENT_PENDING
          ? '还在等家长看一眼'
          : '这份赠予当前不能收下',
      );
    }

    const toName = gift.toStudent?.name || '你';

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(PointGift, {
        where: { id: giftId },
      });
      if (!locked || locked.status !== PointGiftStatus.PENDING) {
        throw new BadRequestException('这份赠予当前不能收下');
      }
      await this.ledger.transfer(manager, {
        fromId: locked.fromStudentId,
        toId: locked.toStudentId,
        amount: locked.amountPoints,
        reasonOut: PointReason.GIFT_OUT,
        reasonIn: PointReason.GIFT_IN,
        refId: locked.id,
        noteOut: `赠予给家人·${locked.amountPoints}分`,
        noteIn: `收到家人赠予·${locked.amountPoints}分`,
        enforceBalance: true,
        insufficientMessage:
          '对方积分不够了，可请对方取消后重试，或先攒够再送',
      });
      locked.status = PointGiftStatus.COMPLETED;
      locked.acceptedAt = new Date();
      await manager.save(locked);
    });

    const out = this.toDto(await this.load(giftId));
    this.notifyStudent(
      gift.fromStudentId,
      'gift:completed',
      {
        message: `${toName}收下了你的 ${gift.amountPoints} 积分心意`,
        giftId,
      },
      '/student/pacts',
    );
    return out;
  }

  async reject(toStudentId: number, giftId: number) {
    await this.requireEnabled(toStudentId);
    const gift = await this.load(giftId);
    if (gift.toStudentId !== toStudentId) {
      throw new ForbiddenException('只有接收方可以婉拒');
    }
    if (gift.status !== PointGiftStatus.PENDING) {
      throw new BadRequestException('这份赠予当前不能婉拒');
    }
    gift.status = PointGiftStatus.CANCELLED;
    await this.gifts.save(gift);
    const out = this.toDto(gift);
    this.notifyStudent(
      gift.fromStudentId,
      'gift:cancelled',
      {
        message: `${gift.toStudent?.name || '对方'}婉拒了你的积分心意`,
        giftId,
      },
      '/student/pacts',
    );
    return out;
  }

  async cancel(fromStudentId: number, giftId: number) {
    await this.requireEnabled(fromStudentId);
    const gift = await this.load(giftId);
    if (gift.fromStudentId !== fromStudentId) {
      throw new ForbiddenException('只有发起人可以取消');
    }
    if (!OPEN_STATUSES.includes(gift.status)) {
      throw new BadRequestException('这份赠予当前不能取消');
    }
    gift.status = PointGiftStatus.CANCELLED;
    await this.gifts.save(gift);
    const out = this.toDto(await this.load(giftId));
    this.notifyStudent(
      gift.toStudentId,
      'gift:cancelled',
      {
        message: `${gift.fromStudent?.name || '家人'}取消了积分赠予`,
        giftId,
      },
      '/student/pacts',
    );
    return out;
  }

  async parentApprove(parentId: number, giftId: number) {
    const gift = await this.assertParentAccess(parentId, giftId);
    if (gift.status !== PointGiftStatus.PARENT_PENDING) {
      throw new BadRequestException('这份赠予不在待家长同意状态');
    }
    gift.status = PointGiftStatus.PENDING;
    gift.parentDecidedAt = new Date();
    await this.gifts.save(gift);
    const out = this.toDto(gift);
    this.notifyStudent(
      gift.toStudentId,
      'gift:pending',
      {
        message: `家长已同意：${out.fromName || '家人'}想赠予你 ${gift.amountPoints} 积分`,
        giftId,
      },
      '/student/pacts',
    );
    this.notifyStudent(
      gift.fromStudentId,
      'gift:pending',
      {
        message: `家长已同意你的赠予，等待对方收下`,
        giftId,
      },
      '/student/pacts',
    );
    return out;
  }

  async parentReject(parentId: number, giftId: number) {
    const gift = await this.assertParentAccess(parentId, giftId);
    if (gift.status !== PointGiftStatus.PARENT_PENDING) {
      throw new BadRequestException('这份赠予不在待家长同意状态');
    }
    gift.status = PointGiftStatus.CANCELLED;
    gift.parentDecidedAt = new Date();
    await this.gifts.save(gift);
    const out = this.toDto(gift);
    this.notifyStudent(
      gift.fromStudentId,
      'gift:cancelled',
      {
        message: '家长没有同意这次积分赠予',
        giftId,
      },
      '/student/pacts',
    );
    return out;
  }

  async parentCancel(parentId: number, giftId: number) {
    const gift = await this.assertParentAccess(parentId, giftId);
    if (!OPEN_STATUSES.includes(gift.status)) {
      throw new BadRequestException('这份赠予已结束，不能取消');
    }
    gift.status = PointGiftStatus.CANCELLED;
    await this.gifts.save(gift);
    const out = this.toDto(gift);
    this.notifyStudent(
      gift.fromStudentId,
      'gift:cancelled',
      { message: '家长取消了这次积分赠予', giftId },
      '/student/pacts',
    );
    this.notifyStudent(
      gift.toStudentId,
      'gift:cancelled',
      { message: '家长取消了一次积分赠予', giftId },
      '/student/pacts',
    );
    return out;
  }

  private async assertParentAccess(parentId: number, giftId: number) {
    const gift = await this.load(giftId);
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (
      !ids.includes(gift.fromStudentId) &&
      !ids.includes(gift.toStudentId)
    ) {
      throw new ForbiddenException('无权处理这份赠予');
    }
    return gift;
  }

  private async load(id: number) {
    const row = await this.gifts.findOne({
      where: { id },
      relations: ['fromStudent', 'toStudent'],
    });
    if (!row) throw new NotFoundException('赠予不存在');
    return row;
  }

  private async requireEnabled(studentId: number) {
    const bundle = await this.policy.loadOne(studentId);
    if (!bundle.pointsPact.pointsPactEnabled) {
      throw new BadRequestException('家庭暂未开启积分约定与赠予');
    }
    if (bundle.edu.ageBand === 'young') {
      throw new BadRequestException('低龄暂不开放积分赠予');
    }
    return bundle.pointsGift;
  }

  private async assertNotYoung(...studentIds: number[]) {
    const users = await this.users.find({
      where: { id: In(studentIds) },
      select: ['id', 'ageBand'],
    });
    if (users.some((u) => u.ageBand === 'young')) {
      throw new BadRequestException(
        '有孩子标记为低龄时暂不开放积分赠予，请用一起完成或轮值代替',
      );
    }
  }

  private async assertSiblings(a: number, b: number) {
    const parentsA = await this.students.getParentIdsOfStudent(a);
    const parentsB = await this.students.getParentIdsOfStudent(b);
    const share = parentsA.some((p) => parentsB.includes(p));
    if (!share) {
      throw new BadRequestException('只能赠予给同一家庭的兄弟姐妹');
    }
  }

  private async assertDailyLimit(fromId: number, dailyMax: number) {
    if (dailyMax <= 0) {
      throw new BadRequestException('家庭暂未开放赠予发起');
    }
    const today = todayStr();
    const start = new Date(`${today}T00:00:00+08:00`);
    const end = new Date(`${today}T23:59:59.999+08:00`);
    const count = await this.gifts.count({
      where: {
        fromStudentId: fromId,
        createdAt: Between(start, end),
      },
    });
    if (count >= dailyMax) {
      throw new BadRequestException(
        `今天已发起 ${count} 次赠予，明天再分享心意吧`,
      );
    }
  }

  private async assertWeeklyOutRoom(
    fromId: number,
    amount: number,
    weeklyMax: number,
  ) {
    if (weeklyMax <= 0) {
      throw new BadRequestException('家庭暂未开放赠予送出');
    }
    const weekStart = shanghaiWeekStart();
    const weekEnd = shanghaiWeekEnd();
    const start = new Date(`${weekStart}T00:00:00+08:00`);
    const end = new Date(`${weekEnd}T23:59:59.999+08:00`);
    const rows = await this.gifts.find({
      where: {
        fromStudentId: fromId,
        status: PointGiftStatus.COMPLETED,
        acceptedAt: Between(start, end),
      },
      select: ['amountPoints'],
    });
    const used = rows.reduce((s, r) => s + r.amountPoints, 0);
    if (used + amount > weeklyMax) {
      throw new BadRequestException(
        `本周已送出 ${used} 分，再送将超过上限 ${weeklyMax} 分`,
      );
    }
  }

  private configDto(bundle: Awaited<ReturnType<FamilyPolicyReader['loadOne']>>) {
    return {
      pointsPactEnabled: bundle.pointsPact.pointsPactEnabled,
      ...bundle.pointsGift,
      pointsPactNote: bundle.pointsPact.pointsPactNote,
    };
  }

  private settingsGiftConfig(settings: {
    pointsPactEnabled: boolean;
    pointsGiftMaxAmount?: number;
    pointsGiftParentApproveAbove?: number;
    pointsGiftDailyMax?: number;
    pointsGiftWeeklyOutMax?: number;
    pointsPactNote?: string | null;
  }) {
    return {
      pointsPactEnabled: !!settings.pointsPactEnabled,
      pointsGiftMaxAmount: settings.pointsGiftMaxAmount ?? 20,
      pointsGiftParentApproveAbove:
        settings.pointsGiftParentApproveAbove ?? 10,
      pointsGiftDailyMax: settings.pointsGiftDailyMax ?? 1,
      pointsGiftWeeklyOutMax: settings.pointsGiftWeeklyOutMax ?? 40,
      pointsPactNote: settings.pointsPactNote || '',
    };
  }

  private toDto(row: PointGift) {
    return {
      id: row.id,
      kind: 'gift' as const,
      fromStudentId: row.fromStudentId,
      toStudentId: row.toStudentId,
      fromName: row.fromStudent?.name || null,
      toName: row.toStudent?.name || null,
      amountPoints: row.amountPoints,
      status: row.status,
      reasonCode: row.reasonCode,
      note: row.note,
      parentDecidedAt: row.parentDecidedAt,
      acceptedAt: row.acceptedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private notifyStudent(
    studentId: number,
    event: string,
    payload: { message: string; giftId: number },
    url: string,
  ) {
    const data = { ...payload, at: new Date().toISOString() };
    this.events?.emitToStudent(studentId, event, data);
    void this.push?.sendToUser(studentId, {
      title: '积分心意',
      body: payload.message.slice(0, 80),
      url,
      tag: `gift-${payload.giftId}`,
    });
  }

  private notifyParents(
    parentIds: number[],
    event: string,
    payload: { message: string; giftId: number },
    url: string,
  ) {
    if (!parentIds.length) return;
    const data = { ...payload, at: new Date().toISOString() };
    this.events?.emitToParents(parentIds, event, data);
    for (const pid of parentIds) {
      void this.push?.sendToUser(pid, {
        title: '积分心意',
        body: payload.message.slice(0, 80),
        url,
        tag: `gift-${payload.giftId}`,
      });
    }
  }
}
