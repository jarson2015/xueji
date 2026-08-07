import { BadRequestException } from '@nestjs/common';
import { PointReason } from '../common/enums';

/** Plain account shape for pure math + unit tests */
export type LedgerAccount = { id: number; pointsBalance: number };

export type LedgerEntryDraft = {
  studentId: number;
  delta: number;
  reason: PointReason;
  refId?: number | null;
  note?: string | null;
};

export function assertPositiveAmount(amount: number, label = '积分数') {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException(`${label}必须大于 0`);
  }
}

/** 加分：返回新余额与流水草稿 */
export function creditAccount(
  account: LedgerAccount,
  amount: number,
  meta: { reason: PointReason; refId?: number | null; note?: string | null },
): { account: LedgerAccount; entry: LedgerEntryDraft } {
  assertPositiveAmount(amount);
  const next = (account.pointsBalance || 0) + amount;
  return {
    account: { ...account, pointsBalance: next },
    entry: {
      studentId: account.id,
      delta: amount,
      reason: meta.reason,
      refId: meta.refId ?? null,
      note: meta.note ?? null,
    },
  };
}

/** 扣分：enforceBalance 时余额不足抛错 */
export function debitAccount(
  account: LedgerAccount,
  amount: number,
  meta: {
    reason: PointReason;
    refId?: number | null;
    note?: string | null;
    enforceBalance?: boolean;
    insufficientMessage?: string;
  },
): { account: LedgerAccount; entry: LedgerEntryDraft } {
  assertPositiveAmount(amount);
  const bal = account.pointsBalance || 0;
  if (meta.enforceBalance !== false && bal < amount) {
    throw new BadRequestException(
      meta.insufficientMessage || `积分不足（需要 ${amount}）`,
    );
  }
  const next = bal - amount;
  return {
    account: { ...account, pointsBalance: next },
    entry: {
      studentId: account.id,
      delta: -amount,
      reason: meta.reason,
      refId: meta.refId ?? null,
      note: meta.note ?? null,
    },
  };
}

/** 双人转账（约定放款/还回本金） */
export function transferAccounts(
  from: LedgerAccount,
  to: LedgerAccount,
  amount: number,
  meta: {
    reasonOut: PointReason;
    reasonIn: PointReason;
    refId?: number | null;
    noteOut: string;
    noteIn: string;
    enforceBalance?: boolean;
    insufficientMessage?: string;
  },
): {
  from: LedgerAccount;
  to: LedgerAccount;
  entries: LedgerEntryDraft[];
} {
  const debited = debitAccount(from, amount, {
    reason: meta.reasonOut,
    refId: meta.refId,
    note: meta.noteOut,
    enforceBalance: meta.enforceBalance,
    insufficientMessage: meta.insufficientMessage,
  });
  const credited = creditAccount(to, amount, {
    reason: meta.reasonIn,
    refId: meta.refId,
    note: meta.noteIn,
  });
  return {
    from: debited.account,
    to: credited.account,
    entries: [debited.entry, credited.entry],
  };
}

/** 打卡发分（含可选连续奖励） */
export function simulateCheckinAward(opts: {
  balance: number;
  studentId: number;
  taskPoints: number;
  checkinId: number;
  taskTitle: string;
  streakBonus?: number;
  streakNote?: string;
}): { balance: number; entries: LedgerEntryDraft[] } {
  let account: LedgerAccount = { id: opts.studentId, pointsBalance: opts.balance };
  const entries: LedgerEntryDraft[] = [];
  const main = creditAccount(account, opts.taskPoints, {
    reason: PointReason.CHECKIN,
    refId: opts.checkinId,
    note: `完成任务: ${opts.taskTitle}`,
  });
  account = main.account;
  entries.push(main.entry);
  if (opts.streakBonus && opts.streakBonus > 0) {
    const bonus = creditAccount(account, opts.streakBonus, {
      reason: PointReason.STREAK,
      refId: opts.checkinId,
      note: opts.streakNote || `连续奖励: ${opts.taskTitle}`,
    });
    account = bonus.account;
    entries.push(bonus.entry);
  }
  return { balance: account.pointsBalance, entries };
}

/** 兑换扣分 → 再商量退回 */
export function simulateRedeemRefund(opts: {
  balance: number;
  studentId: number;
  cost: number;
  wishId: number;
  redeemId: number;
  wishTitle: string;
}): {
  afterRedeem: number;
  afterRefund: number;
  redeemEntry: LedgerEntryDraft;
  refundEntry: LedgerEntryDraft;
} {
  let account: LedgerAccount = { id: opts.studentId, pointsBalance: opts.balance };
  const redeem = debitAccount(account, opts.cost, {
    reason: PointReason.REDEEM,
    refId: opts.wishId,
    note: `兑换愿望: ${opts.wishTitle}`,
    enforceBalance: true,
  });
  account = redeem.account;
  const refund = creditAccount(account, opts.cost, {
    reason: PointReason.ADJUST,
    refId: opts.redeemId,
    note: `兑换再商量退回: ${opts.wishTitle}`,
  });
  return {
    afterRedeem: redeem.account.pointsBalance,
    afterRefund: refund.account.pointsBalance,
    redeemEntry: redeem.entry,
    refundEntry: refund.entry,
  };
}

/** 约定放款 + 还回（含可选逾期补分） */
export function simulatePactLendAndRepay(opts: {
  lenderBalance: number;
  borrowerBalance: number;
  lenderId: number;
  borrowerId: number;
  amount: number;
  pactId: number;
  overdueExtra?: number;
}): {
  afterLend: { lender: number; borrower: number };
  afterRepay: { lender: number; borrower: number };
  lendEntries: LedgerEntryDraft[];
  repayEntries: LedgerEntryDraft[];
} {
  let lender: LedgerAccount = {
    id: opts.lenderId,
    pointsBalance: opts.lenderBalance,
  };
  let borrower: LedgerAccount = {
    id: opts.borrowerId,
    pointsBalance: opts.borrowerBalance,
  };
  const note = `积分约定#${opts.pactId}`;
  const lend = transferAccounts(lender, borrower, opts.amount, {
    reasonOut: PointReason.PACT_OUT,
    reasonIn: PointReason.PACT_IN,
    refId: opts.pactId,
    noteOut: `${note}·借出`,
    noteIn: `${note}·借用`,
    enforceBalance: true,
    insufficientMessage: `你的积分不够借出（需要 ${opts.amount} 积分）`,
  });
  lender = lend.from;
  borrower = lend.to;

  const repayPrincipal = transferAccounts(borrower, lender, opts.amount, {
    reasonOut: PointReason.PACT_RETURN,
    reasonIn: PointReason.PACT_RETURN,
    refId: opts.pactId,
    noteOut: `${note}·还回`,
    noteIn: `${note}·收回`,
    enforceBalance: true,
  });
  borrower = repayPrincipal.from;
  lender = repayPrincipal.to;
  const repayEntries = [...repayPrincipal.entries];
  const extra = opts.overdueExtra || 0;
  if (extra > 0) {
    const overdue = transferAccounts(borrower, lender, extra, {
      reasonOut: PointReason.PACT_OVERDUE,
      reasonIn: PointReason.PACT_OVERDUE,
      refId: opts.pactId,
      noteOut: `${note}·逾期补分`,
      noteIn: `${note}·逾期补分`,
      enforceBalance: true,
    });
    borrower = overdue.from;
    lender = overdue.to;
    repayEntries.push(...overdue.entries);
  }
  return {
    afterLend: {
      lender: lend.from.pointsBalance,
      borrower: lend.to.pointsBalance,
    },
    afterRepay: {
      lender: lender.pointsBalance,
      borrower: borrower.pointsBalance,
    },
    lendEntries: lend.entries,
    repayEntries,
  };
}
