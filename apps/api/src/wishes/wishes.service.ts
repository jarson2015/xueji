import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { WishItem } from '../entities/wish-item.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { User } from '../entities/user.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import {
  AssignStatus,
  PointReason,
  RedeemStatus,
  TaskCategory,
  WishKind,
  WishType,
} from '../common/enums';
import {
  FAMILY_HELP_CARD_LABEL,
  defaultFamilyHelpCardTitle,
} from '../common/wish-narrative';
import {
  MAX_ACTIVE_NEAR_TERM_WISHES,
  isNearTermRoomFull,
} from '../common/near-wish-policy';
import { currentPeriodKey, isPeriodRolled } from '../task-lifecycle/lifecycle';
import { StudentsService } from '../students/students.service';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../family/audit.service';
import { PointsLedgerService } from '../points/points-ledger.service';
import { GrowthService } from '../growth/growth.service';
import { PushService } from '../push/push.service';
import {
  CreateWishDto,
  ProposeWishDto,
  ApproveWishDto,
  ReviewRedeemDto,
  UpdateWishDto,
} from './dto';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(WishItem) private readonly wishes: Repository<WishItem>,
    @InjectRepository(WishRedeem) private readonly redeems: Repository<WishRedeem>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PointLedger) private readonly ledgers: Repository<PointLedger>,
    @InjectRepository(TaskAssign) private readonly assigns: Repository<TaskAssign>,
    private readonly students: StudentsService,
    private readonly events: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly ledger: PointsLedgerService,
    private readonly growth: GrowthService,
    @Optional() private readonly push?: PushService,
  ) {}

  async listForParent(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) return [];
    return this.wishes.find({
      where: { studentId: In(studentIds) },
      relations: ['student'],
      order: { id: 'DESC' },
      take: 100,
    });
  }

  async listForStudent(studentId: number) {
    return this.wishes.find({
      where: { studentId, active: true, proposed: false },
      order: { id: 'DESC' },
    });
  }

  /** Student: own proposals (pending + rejected shelf = inactive proposed cleared) */
  async listMyProposals(studentId: number) {
    return this.wishes.find({
      where: { studentId, proposed: true },
      order: { id: 'DESC' },
      take: 20,
    });
  }

  async create(parentId: number, dto: CreateWishDto) {
    await this.students.assertBound(parentId, dto.studentId);
    const type = dto.type || WishType.NORMAL;
    const kind =
      type === WishType.GOLDEN_FINGER
        ? WishKind.ITEM
        : dto.kind || WishKind.ITEM;
    const title =
      dto.title.trim() ||
      (type === WishType.GOLDEN_FINGER ? defaultFamilyHelpCardTitle() : '');
    if (!title) throw new BadRequestException('请填写愿望标题');
    const isNearTerm = !!dto.isNearTerm;
    if (isNearTerm) {
      await this.assertNearTermRoom(dto.studentId);
    }
    return this.wishes.save(
      this.wishes.create({
        parentId,
        studentId: dto.studentId,
        title,
        costPoints: dto.costPoints,
        type,
        kind,
        active: true,
        proposed: false,
        isNearTerm,
      }),
    );
  }

  /** 同一学生在架近端愿望最多 MAX_ACTIVE_NEAR_TERM_WISHES 条 */
  private async assertNearTermRoom(
    studentId: number,
    excludeWishId?: number,
  ) {
    const rows = await this.wishes.find({
      where: {
        studentId,
        active: true,
        proposed: false,
        isNearTerm: true,
      },
      select: ['id'],
    });
    const count = rows.filter((r) => r.id !== excludeWishId).length;
    if (isNearTermRoomFull(count)) {
      throw new BadRequestException(
        `近端愿望最多 ${MAX_ACTIVE_NEAR_TERM_WISHES} 个，先兑掉或取消标记后再加`,
      );
    }
  }

  async propose(studentId: number, dto: ProposeWishDto) {
    const type = dto.type || WishType.NORMAL;
    if (type === WishType.GOLDEN_FINGER) {
      throw new BadRequestException(
        `${FAMILY_HELP_CARD_LABEL}请让家长添加；你可以提普通愿望`,
      );
    }
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('请写愿望标题');
    const parents = await this.students.getParentIdsOfStudent(studentId);
    if (!parents.length) throw new BadRequestException('还没有绑定家长');
    const parentId = parents[0];
    const wish = await this.wishes.save(
      this.wishes.create({
        parentId,
        studentId,
        title,
        costPoints: dto.suggestedCostPoints || 1,
        type,
        kind: dto.kind || WishKind.ITEM,
        active: false,
        proposed: true,
      }),
    );
    const student = await this.users.findOne({ where: { id: studentId } });
    this.events.emitToParents(parents, 'wish:proposed', {
      wishId: wish.id,
      studentId,
      title: wish.title,
      studentName: student?.name || '孩子',
      message: `${student?.name || '孩子'}提了一个愿望，请定积分后上架`,
    });
    return wish;
  }

  async approveProposal(
    parentId: number,
    wishId: number,
    dto: ApproveWishDto,
  ) {
    const wish = await this.wishes.findOne({ where: { id: wishId } });
    if (!wish) throw new NotFoundException('愿望不存在');
    await this.students.assertBound(parentId, wish.studentId);
    if (!wish.proposed) {
      throw new BadRequestException('该愿望不是待审定提报');
    }
    if (dto.title !== undefined) wish.title = dto.title.trim() || wish.title;
    wish.costPoints = dto.costPoints;
    if (dto.type !== undefined) wish.type = dto.type;
    if (dto.kind !== undefined) wish.kind = dto.kind;
    wish.proposed = false;
    wish.active = true;
    wish.parentId = parentId;
    if (dto.isNearTerm !== undefined) {
      if (dto.isNearTerm) await this.assertNearTermRoom(wish.studentId, wish.id);
      wish.isNearTerm = dto.isNearTerm;
    }
    const saved = await this.wishes.save(wish);
    this.events.emitToStudent(wish.studentId, 'wish:approved', {
      wish: saved,
      message: `家长已把「${saved.title}」上架到愿望商店`,
    });
    return saved;
  }

  async update(parentId: number, wishId: number, dto: UpdateWishDto) {
    const wish = await this.wishes.findOne({ where: { id: wishId } });
    if (!wish) throw new NotFoundException('愿望不存在');
    await this.students.assertBound(parentId, wish.studentId);
    if (wish.proposed && dto.active === true) {
      throw new BadRequestException('待审定愿望请通过「审定上架」接口上架');
    }
    if (dto.title !== undefined) wish.title = dto.title;
    if (dto.costPoints !== undefined) wish.costPoints = dto.costPoints;
    if (dto.active !== undefined) wish.active = dto.active;
    if (dto.type !== undefined) wish.type = dto.type;
    if (dto.kind !== undefined) wish.kind = dto.kind;
    if (dto.isNearTerm !== undefined) {
      if (dto.isNearTerm && wish.active && !wish.proposed) {
        await this.assertNearTermRoom(wish.studentId, wish.id);
      }
      wish.isNearTerm = dto.isNearTerm;
    }
    return this.wishes.save(wish);
  }

  async remove(parentId: number, wishId: number) {
    const wish = await this.wishes.findOne({ where: { id: wishId } });
    if (!wish) throw new NotFoundException('愿望不存在');
    await this.students.assertBound(parentId, wish.studentId);
    const pending = await this.redeems.findOne({
      where: { wishId, status: RedeemStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException('还有兑换在等你处理，先兑现或先缓缓再删');
    }
    await this.redeems.delete({ wishId });
    await this.wishes.delete({ id: wishId });
    this.events.emitToStudent(wish.studentId, 'wish:removed', {
      wishId,
      title: wish.title,
      message: `愿望「${wish.title}」已从清单移除`,
    });
    return { deleted: true };
  }

  async redeem(studentId: number, wishId: number) {
    return this.dataSource.transaction(async (manager) => {
      const wish = await manager.findOne(WishItem, {
        where: { id: wishId, studentId, active: true, proposed: false },
      });
      if (!wish) throw new NotFoundException('愿望不存在');
      const pending = await manager.findOne(WishRedeem, {
        where: {
          wishId,
          studentId,
          status: RedeemStatus.PENDING,
        },
      });
      if (pending) {
        throw new BadRequestException('已有兑换申请在等家长看看');
      }
      const student = await manager.findOne(User, { where: { id: studentId } });
      if (!student) throw new NotFoundException('学生不存在');
      const cost = wish.costPoints;
      const balance = await this.ledger.debit(manager, {
        studentId,
        amount: cost,
        reason: PointReason.REDEEM,
        refId: wishId,
        note:
          wish.type === WishType.GOLDEN_FINGER
            ? `兑换${FAMILY_HELP_CARD_LABEL}: ${wish.title}`
            : `兑换愿望: ${wish.title}`,
        enforceBalance: true,
        insufficientMessage: '积分不足',
      });
      const redeem = await manager.save(
        manager.create(WishRedeem, {
          wishId,
          studentId,
          status: RedeemStatus.PENDING,
          costPoints: cost,
        }),
      );
      const parentIds = await this.students.getParentIdsOfStudent(studentId);
      this.events.emitToParents(parentIds, 'redeem:requested', {
        redeem: {
          id: redeem.id,
          studentId,
          costPoints: redeem.costPoints,
          createdAt: redeem.createdAt,
        },
        wish: { title: wish.title },
        studentName: student.name,
        pointsBalance: balance,
      });
      const body = `${student.name}想兑换「${wish.title}」`;
      for (const pid of parentIds) {
        void this.push?.sendToUser(pid, {
          title: '兑换申请',
          body: body.slice(0, 80),
          url: '/parent/wishes',
          tag: `redeem-${redeem.id}`,
        });
      }
      return redeem;
    });
  }

  async listRedeems(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) return [];
    // pending 优先（上限 50）+ 近期历史 50，避免全表膨胀
    const [pending, history] = await Promise.all([
      this.redeems.find({
        where: {
          studentId: In(studentIds),
          status: RedeemStatus.PENDING,
        },
        relations: ['wish', 'student'],
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.redeems.find({
        where: {
          studentId: In(studentIds),
          status: Not(RedeemStatus.PENDING),
        },
        relations: ['wish', 'student'],
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);
    return [...pending, ...history];
  }

  async listRedeemsForStudent(studentId: number) {
    return this.redeems.find({
      where: { studentId },
      relations: ['wish'],
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }

  async ackRedeem(studentId: number, redeemId: number) {
    const redeem = await this.redeems.findOne({
      where: { id: redeemId },
      relations: ['wish'],
    });
    if (!redeem || redeem.studentId !== studentId) {
      throw new NotFoundException('兑换记录不存在');
    }
    if (redeem.status !== RedeemStatus.APPROVED) {
      throw new BadRequestException('家长还没兑现呢');
    }
    if (redeem.studentAckAt) return redeem;
    redeem.studentAckAt = new Date();
    await this.redeems.save(redeem);
    const parentIds = await this.students.getParentIdsOfStudent(studentId);
    this.events.emitToParents(parentIds, 'redeem:acked', {
      redeemId: redeem.id,
      studentId,
      wishTitle: redeem.wish?.title,
      at: redeem.studentAckAt.toISOString(),
    });
    return redeem;
  }

  /** List unfinished chore assigns for golden-finger target picker */
  async listWaivableChores(parentId: number, studentId: number) {
    await this.students.assertBound(parentId, studentId);
    const rows = await this.assigns.find({
      where: { studentId, status: AssignStatus.ACTIVE },
      relations: ['task'],
      order: { id: 'DESC' },
    });
    return rows
      .filter((a) => {
        if (!a.task?.active) return false;
        if (a.task.category !== TaskCategory.CHORE) return false;
        const periodKey = currentPeriodKey(a.task.schedule);
        const progress = isPeriodRolled(a.task.schedule, a.periodKey)
          ? 0
          : a.progressPercent;
        return progress < 100;
      })
      .map((a) => ({
        assignId: a.id,
        taskId: a.taskId,
        title: a.task.title,
        schedule: a.task.schedule,
        progressPercent: a.progressPercent,
      }));
  }

  async review(
    parentId: number,
    redeemId: number,
    dto: ReviewRedeemDto,
    actorName?: string,
  ) {
    if (dto.action === 'reject' && !dto.note?.trim()) {
      throw new BadRequestException('请写一句给孩子，说明为什么先缓缓');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const redeem = await manager.findOne(WishRedeem, {
        where: { id: redeemId },
        relations: ['wish', 'student'],
      });
      if (!redeem) throw new NotFoundException('兑换记录不存在');
      await this.students.assertBound(parentId, redeem.studentId);
      if (redeem.status !== RedeemStatus.PENDING) {
        throw new BadRequestException('已处理');
      }
      if (dto.action === 'approve') {
        redeem.status = RedeemStatus.APPROVED;
        let waiver: { assignId: number; title: string } | null = null;
        if (redeem.wish?.type === WishType.GOLDEN_FINGER) {
          waiver = await this.applyChoreWaiver(
            manager,
            redeem.studentId,
            dto.targetAssignId,
          );
          if (waiver) {
            redeem.effectType = 'chore_waiver';
            redeem.effectAssignId = waiver.assignId;
            redeem.effectTitle = waiver.title;
          }
        }
        await manager.save(redeem);
        return { redeem, refunded: 0, waiver };
      }
      redeem.status = RedeemStatus.REJECTED;
      await manager.save(redeem);
      const refund =
        redeem.costPoints > 0
          ? redeem.costPoints
          : redeem.wish?.costPoints || 0;
      if (refund > 0) {
        await this.ledger.credit(manager, {
          studentId: redeem.studentId,
          amount: refund,
          reason: PointReason.ADJUST,
          refId: redeem.id,
          note: `兑换再商量退回: ${redeem.wish?.title || ''}`,
        });
      }
      return { redeem, refunded: refund, waiver: null as any };
    });

    const student = await this.users.findOne({
      where: { id: result.redeem.studentId },
    });
    const isFinger = result.redeem.wish?.type === WishType.GOLDEN_FINGER;
    const waivedTitle = result.waiver?.title;
    let message =
      result.redeem.status === RedeemStatus.APPROVED
        ? isFinger
            ? waivedTitle
              ? `${FAMILY_HELP_CARD_LABEL}已兑现：今天先不用做「${waivedTitle}」。责任还在，可以改日补做或换一件力所能及的事`
              : `${FAMILY_HELP_CARD_LABEL}已兑现（当前没有可免的家务）。免做不是责任消失，下次有家务时再和家长商量`
            : '家长已兑现你的愿望，开心一下'
        : '家长说先缓缓，积分已退回';
    if (dto.action === 'reject' && dto.note?.trim()) {
      message = `${message}：「${dto.note.trim()}」`;
    }

    this.events.emitToStudent(result.redeem.studentId, 'redeem:reviewed', {
      redeemId: result.redeem.id,
      wishId: result.redeem.wishId,
      wishTitle: result.redeem.wish?.title,
      wishType: result.redeem.wish?.type || WishType.NORMAL,
      status: result.redeem.status,
      refunded: result.refunded,
      pointsBalance: student?.pointsBalance ?? 0,
      effectType: result.redeem.effectType,
      effectAssignId: result.redeem.effectAssignId,
      effectTitle: result.redeem.effectTitle,
      message,
    });

    if (result.waiver) {
      const parentIds = await this.students.getParentIdsOfStudent(
        result.redeem.studentId,
      );
      this.events.emitToParents(parentIds, 'progress:changed', {
        assignId: result.waiver.assignId,
        studentId: result.redeem.studentId,
        progressPercent: 100,
        status: AssignStatus.COMPLETED,
        effect: 'chore_waiver',
      });
    }

    if (
      dto.action === 'approve' &&
      result.redeem.wish?.isNearTerm &&
      result.redeem.wish?.title
    ) {
      void this.growth
        .recordNearWishRedeemed(
          result.redeem.studentId,
          result.redeem.wish.title,
        )
        .catch(() => undefined);
    }

    if (dto.action === 'reject' || isFinger) {
      void this.audit.notifyCoParents({
        actorId: parentId,
        actorName,
        studentId: result.redeem.studentId,
        action: dto.action === 'reject' ? 'redeem_reject' : 'redeem_approve',
        message:
          dto.action === 'reject'
            ? `${actorName || '家长'}对「${result.redeem.wish?.title}」说先缓缓`
            : `${actorName || '家长'}兑现了「${result.redeem.wish?.title}」`,
        detail: { redeemId: result.redeem.id, note: dto.note },
      });
    }

    return result.redeem;
  }

  private async applyChoreWaiver(
    manager: any,
    studentId: number,
    targetAssignId?: number,
  ): Promise<{ assignId: number; title: string } | null> {
    let assign: TaskAssign | null = null;
    if (targetAssignId) {
      assign = await manager.findOne(TaskAssign, {
        where: { id: targetAssignId, studentId },
        relations: ['task'],
      });
      if (!assign?.task || assign.task.category !== TaskCategory.CHORE) {
        throw new BadRequestException(
          `请选择一项家务任务来使用${FAMILY_HELP_CARD_LABEL}`,
        );
      }
    } else {
      const rows: TaskAssign[] = await manager.find(TaskAssign, {
        where: { studentId, status: AssignStatus.ACTIVE },
        relations: ['task'],
        order: { id: 'ASC' },
      });
      assign =
        rows.find((a) => {
          if (!a.task?.active || a.task.category !== TaskCategory.CHORE) {
            return false;
          }
          const periodKey = currentPeriodKey(a.task.schedule);
          if (isPeriodRolled(a.task.schedule, a.periodKey)) {
            return true; // reset period → unfinished
          }
          return a.progressPercent < 100;
        }) || null;
    }
    if (!assign?.task) return null;

    const periodKey = currentPeriodKey(assign.task.schedule);
    assign.periodKey = periodKey;
    assign.progressValue = assign.task.targetValue;
    assign.progressPercent = 100;
    assign.status = AssignStatus.COMPLETED;
    await manager.save(assign);
    return { assignId: assign.id, title: assign.task.title };
  }

  async points(studentId: number) {
    const user = await this.users.findOne({ where: { id: studentId } });
    const ledgers = await this.ledgers.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const balance = user?.pointsBalance ?? 0;
    const activeWishes = await this.wishes.find({
      where: { studentId, active: true, proposed: false },
      order: { costPoints: 'ASC' },
    });
    const next =
      activeWishes.find((w) => w.costPoints > balance) || activeWishes[0] || null;
    return {
      balance,
      ledgers,
      rulesHint:
        `做完任务可得分；需要家长确认的，通过后才加分。${FAMILY_HELP_CARD_LABEL}可用积分兑换，兑现后免做一次家务。`,
      nextWish: next
        ? {
            wishId: next.id,
            title: next.title,
            costPoints: next.costPoints,
            lackPoints: Math.max(0, next.costPoints - balance),
            type: next.type || WishType.NORMAL,
          }
        : null,
    };
  }
}
