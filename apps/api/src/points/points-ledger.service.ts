import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { PointReason } from '../common/enums';
import {
  creditAccount,
  debitAccount,
  transferAccounts,
  type LedgerAccount,
} from './points-ledger-math';

@Injectable()
export class PointsLedgerService {
  constructor(private readonly dataSource: DataSource) {}

  private async loadAccount(
    manager: EntityManager,
    studentId: number,
  ): Promise<LedgerAccount & { entity: User }> {
    const entity = await manager.findOne(User, { where: { id: studentId } });
    if (!entity) {
      throw new NotFoundException('学生不存在');
    }
    return {
      id: entity.id,
      pointsBalance: entity.pointsBalance || 0,
      entity,
    };
  }

  private async persist(
    manager: EntityManager,
    account: LedgerAccount & { entity: User },
    entry: {
      studentId: number;
      delta: number;
      reason: PointReason;
      refId?: number | null;
      note?: string | null;
    },
  ) {
    account.entity.pointsBalance = account.pointsBalance;
    await manager.save(account.entity);
    await manager.save(
      manager.create(PointLedger, {
        studentId: entry.studentId,
        delta: entry.delta,
        reason: entry.reason,
        refId: entry.refId ?? null,
        note: entry.note ?? null,
      }),
    );
  }

  /** 加分 */
  async credit(
    manager: EntityManager,
    opts: {
      studentId: number;
      amount: number;
      reason: PointReason;
      refId?: number | null;
      note?: string | null;
    },
  ): Promise<number> {
    if (!opts.amount) return (await this.loadAccount(manager, opts.studentId)).pointsBalance;
    const loaded = await this.loadAccount(manager, opts.studentId);
    const { account, entry } = creditAccount(loaded, opts.amount, opts);
    await this.persist(manager, { ...loaded, ...account }, entry);
    return account.pointsBalance;
  }

  /** 扣分 */
  async debit(
    manager: EntityManager,
    opts: {
      studentId: number;
      amount: number;
      reason: PointReason;
      refId?: number | null;
      note?: string | null;
      enforceBalance?: boolean;
      insufficientMessage?: string;
    },
  ): Promise<number> {
    if (!opts.amount) return (await this.loadAccount(manager, opts.studentId)).pointsBalance;
    const loaded = await this.loadAccount(manager, opts.studentId);
    const { account, entry } = debitAccount(loaded, opts.amount, opts);
    await this.persist(manager, { ...loaded, ...account }, entry);
    return account.pointsBalance;
  }

  /** 双人转账（约定放款/还回） */
  async transfer(
    manager: EntityManager,
    opts: {
      fromId: number;
      toId: number;
      amount: number;
      reasonOut: PointReason;
      reasonIn: PointReason;
      refId?: number | null;
      noteOut: string;
      noteIn: string;
      enforceBalance?: boolean;
      insufficientMessage?: string;
    },
  ): Promise<{ fromBalance: number; toBalance: number }> {
    const fromLoaded = await this.loadAccount(manager, opts.fromId);
    const toLoaded = await this.loadAccount(manager, opts.toId);
    const result = transferAccounts(fromLoaded, toLoaded, opts.amount, {
      reasonOut: opts.reasonOut,
      reasonIn: opts.reasonIn,
      refId: opts.refId,
      noteOut: opts.noteOut,
      noteIn: opts.noteIn,
      enforceBalance: opts.enforceBalance,
      insufficientMessage: opts.insufficientMessage,
    });
    await this.persist(
      manager,
      { ...fromLoaded, pointsBalance: result.from.pointsBalance },
      result.entries[0],
    );
    // reload to entity after first save — toLoaded.entity may be stale on balance only
    toLoaded.pointsBalance = result.to.pointsBalance;
    await this.persist(
      manager,
      { ...toLoaded, pointsBalance: result.to.pointsBalance },
      result.entries[1],
    );
    return {
      fromBalance: result.from.pointsBalance,
      toBalance: result.to.pointsBalance,
    };
  }

  /** weekly_digest 占位流水（delta=0） */
  async recordPendingDigest(
    manager: EntityManager,
    studentId: number,
    points: number,
    checkinId: number,
    title: string,
  ) {
    if (points <= 0) return;
    await manager.save(
      manager.create(PointLedger, {
        studentId,
        delta: 0,
        reason: PointReason.WEEKLY_DIGEST,
        refId: checkinId,
        note: `PENDING:${points}|${title}`,
      }),
    );
  }

  /** 结算 PENDING 周汇总（幂等） */
  async settleWeeklyDigest(studentId: number): Promise<{
    settled: number;
    points: number;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const pending = await manager.find(PointLedger, {
        where: {
          studentId,
          reason: PointReason.WEEKLY_DIGEST,
        },
        order: { id: 'ASC' },
      });
      const open = pending.filter(
        (p) => typeof p.note === 'string' && p.note.startsWith('PENDING:'),
      );
      if (!open.length) return { settled: 0, points: 0 };

      let total = 0;
      for (const row of open) {
        const m = /^PENDING:(\d+)/.exec(row.note || '');
        const n = m ? Number(m[1]) : 0;
        if (n > 0) total += n;
        row.note = (row.note || '').replace(/^PENDING:/, 'SETTLED:');
        await manager.save(row);
      }
      if (total > 0) {
        await this.credit(manager, {
          studentId,
          amount: total,
          reason: PointReason.WEEKLY_DIGEST,
          refId: open[0].refId || 0,
          note: `本周汇总结算 ${open.length} 笔`,
        });
      }
      return { settled: open.length, points: total };
    });
  }
}
