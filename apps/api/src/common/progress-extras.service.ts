import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { WishItem } from '../entities/wish-item.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { CheckIn } from '../entities/checkin.entity';
import { User } from '../entities/user.entity';
import { ConfirmStatus, RedeemStatus } from '../common/enums';
import { formatDate } from '../common/date-util';
import { FamilyService } from '../family/family.service';
import { pickNextWishTarget } from './near-wish-policy';

@Injectable()
export class ProgressExtrasService {
  constructor(
    @InjectRepository(WishItem) private readonly wishes: Repository<WishItem>,
    @InjectRepository(WishRedeem)
    private readonly redeems: Repository<WishRedeem>,
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @Optional()
    @Inject(forwardRef(() => FamilyService))
    private readonly family?: FamilyService,
  ) {}

  /** 周报用：近端愿望活跃数 / 本周已兑 / 待兑 */
  async nearWishStats(
    studentId: number,
    since: Date,
  ): Promise<{
    activeCount: number
    redeemedThisWeek: number
    pendingCount: number
    nextTitle: string | null
    message: string
  }> {
    const [activeNear, redeems] = await Promise.all([
      this.wishes.find({
        where: {
          studentId,
          active: true,
          proposed: false,
          isNearTerm: true,
        },
        order: { costPoints: 'ASC' },
      }),
      this.redeems.find({
        where: {
          studentId,
          createdAt: MoreThanOrEqual(since),
        },
        relations: ['wish'],
        order: { createdAt: 'DESC' },
        take: 40,
      }),
    ]);
    const nearRedeems = redeems.filter((r) => r.wish?.isNearTerm);
    const redeemedThisWeek = nearRedeems.filter(
      (r) => r.status === RedeemStatus.APPROVED,
    ).length;
    const pendingCount = nearRedeems.filter(
      (r) => r.status === RedeemStatus.PENDING,
    ).length;
    const nextTitle = activeNear[0]?.title || null;
    let message = '';
    if (redeemedThisWeek > 0) {
      message = `本周已兑现 ${redeemedThisWeek} 个近端愿望`;
      if (activeNear.length) {
        message += `，还有 ${activeNear.length} 个在路上`;
      }
    } else if (pendingCount > 0) {
      message = `有 ${pendingCount} 个近端愿望等家长兑现`;
    } else if (activeNear.length) {
      message = nextTitle
        ? `近端愿望还差一点点：「${nextTitle}」`
        : `有 ${activeNear.length} 个近端愿望在努力中`;
    } else {
      message = '这周还没有近端愿望，可以定一个小目标';
    }
    return {
      activeCount: activeNear.length,
      redeemedThisWeek,
      pendingCount,
      nextTitle,
      message,
    };
  }

  async nextWish(studentId: number, balance?: number) {
    let points = balance;
    if (points === undefined) {
      const user = await this.users.findOne({ where: { id: studentId } });
      points = user?.pointsBalance ?? 0;
    }
    const list = await this.wishes.find({
      where: { studentId, active: true, proposed: false },
      order: { costPoints: 'ASC' },
    });
    if (!list.length) return null;
    const target = pickNextWishTarget(list, points as number);
    if (!target) return null;
    return {
      title: target.title,
      costPoints: target.costPoints,
      lackPoints: Math.max(0, target.costPoints - (points as number)),
      wishId: target.id,
      isNearTerm: !!target.isNearTerm,
    };
  }

  /** Batch nextWish for parent monitor (one wish query + balances). */
  async nextWishesForStudents(
    studentIds: number[],
    balanceById?: Map<number, number>,
  ): Promise<
    Map<
      number,
      {
        title: string;
        costPoints: number;
        lackPoints: number;
        wishId: number;
        isNearTerm: boolean;
      } | null
    >
  > {
    const out = new Map<
      number,
      {
        title: string;
        costPoints: number;
        lackPoints: number;
        wishId: number;
        isNearTerm: boolean;
      } | null
    >();
    if (!studentIds.length) return out;
    for (const id of studentIds) out.set(id, null);

    let balances = balanceById;
    if (!balances) {
      const users = await this.users.find({
        where: { id: In(studentIds) },
        select: ['id', 'pointsBalance'],
      });
      balances = new Map(users.map((u) => [u.id, u.pointsBalance ?? 0]));
    }

    const list = await this.wishes.find({
      where: { studentId: In(studentIds), active: true, proposed: false },
      order: { costPoints: 'ASC' },
    });
    const byStudent = new Map<number, typeof list>();
    for (const w of list) {
      const arr = byStudent.get(w.studentId) || [];
      arr.push(w);
      byStudent.set(w.studentId, arr);
    }
    for (const sid of studentIds) {
      const poolAll = byStudent.get(sid) || [];
      if (!poolAll.length) continue;
      const points = balances.get(sid) ?? 0;
      const target = pickNextWishTarget(poolAll, points);
      if (!target) continue;
      out.set(sid, {
        title: target.title,
        costPoints: target.costPoints,
        lackPoints: Math.max(0, target.costPoints - points),
        wishId: target.id,
        isNearTerm: !!target.isNearTerm,
      });
    }
    return out;
  }

  /** Global check-in streak; rest days pause without breaking */
  async streak(studentId: number) {
    const map = await this.streaksForStudents([studentId]);
    return map.get(studentId) || 0;
  }

  /** Batch streaks for parent dashboard (one checkin query + one rest map). */
  async streaksForStudents(
    studentIds: number[],
  ): Promise<Map<number, number>> {
    const out = new Map<number, number>();
    if (!studentIds.length) return out;

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const rows = await this.checkins.find({
      where: {
        studentId: In(studentIds),
        createdAt: MoreThanOrEqual(since),
        confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED]),
      },
      select: ['studentId', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    const daySets = new Map<number, Set<string>>();
    for (const id of studentIds) daySets.set(id, new Set());
    for (const r of rows) {
      daySets.get(r.studentId)?.add(formatDate(r.createdAt));
    }

    const keys: string[] = [];
    const cursor = new Date();
    for (let i = 0; i < 90; i++) {
      keys.push(formatDate(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
    const restByStudent = this.family
      ? await this.family.batchRestDayKeys(studentIds, keys)
      : new Map<number, Map<string, boolean>>();

    for (const sid of studentIds) {
      out.set(
        sid,
        this.computeStreakFromDaySet(
          daySets.get(sid) || new Set(),
          restByStudent.get(sid),
        ),
      );
    }
    return out;
  }

  private computeStreakFromDaySet(
    daySet: Set<string>,
    restMap?: Map<string, boolean>,
  ) {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 90; i++) {
      const key = formatDate(d);
      const isRest = !!restMap?.get(key);
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
