/**
 * Money-path unit tests — checkin award, redeem refund, pact lend/repay.
 * Run: npm run test:unit
 */
import assert from 'assert';
import { PointReason } from '../common/enums';
import {
  creditAccount,
  debitAccount,
  simulateCheckinAward,
  simulateRedeemRefund,
  simulatePactLendAndRepay,
} from './points-ledger-math';
import { displayOverdueExtra } from '../pacts/pact-math';
import { addShanghaiDays, todayStr } from '../common/date-util';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('points-ledger money-path unit tests');

test('credit increases balance and writes positive delta', () => {
  const { account, entry } = creditAccount(
    { id: 1, pointsBalance: 10 },
    5,
    { reason: PointReason.CHECKIN, refId: 9, note: '完成任务: 阅读' },
  );
  assert.strictEqual(account.pointsBalance, 15);
  assert.strictEqual(entry.delta, 5);
  assert.strictEqual(entry.reason, PointReason.CHECKIN);
});

test('debit enforces balance', () => {
  assert.throws(
    () =>
      debitAccount(
        { id: 1, pointsBalance: 3 },
        5,
        { reason: PointReason.REDEEM, enforceBalance: true },
      ),
    /积分不足/,
  );
});

test('打卡发分：任务分 + 连续奖励', () => {
  const res = simulateCheckinAward({
    balance: 20,
    studentId: 2,
    taskPoints: 10,
    checkinId: 100,
    taskTitle: '背单词',
    streakBonus: 5,
    streakNote: '连续7天: 背单词',
  });
  assert.strictEqual(res.balance, 35);
  assert.strictEqual(res.entries.length, 2);
  assert.strictEqual(res.entries[0].reason, PointReason.CHECKIN);
  assert.strictEqual(res.entries[1].reason, PointReason.STREAK);
  assert.strictEqual(
    res.entries.reduce((s, e) => s + e.delta, 0),
    15,
  );
});

test('兑换退回：扣分后再商量加回，余额守恒', () => {
  const res = simulateRedeemRefund({
    balance: 50,
    studentId: 3,
    cost: 20,
    wishId: 7,
    redeemId: 8,
    wishTitle: '周末电影',
  });
  assert.strictEqual(res.afterRedeem, 30);
  assert.strictEqual(res.afterRefund, 50);
  assert.strictEqual(res.redeemEntry.reason, PointReason.REDEEM);
  assert.strictEqual(res.refundEntry.reason, PointReason.ADJUST);
  assert.strictEqual(res.redeemEntry.delta + res.refundEntry.delta, 0);
});

test('约定放款还回：本金守恒，逾期补分另计', () => {
  const res = simulatePactLendAndRepay({
    lenderBalance: 40,
    borrowerBalance: 5,
    lenderId: 1,
    borrowerId: 2,
    amount: 10,
    pactId: 55,
    overdueExtra: 2,
  });
  assert.strictEqual(res.afterLend.lender, 30);
  assert.strictEqual(res.afterLend.borrower, 15);
  // after repay: lender 30+10+2=42, borrower 15-10-2=3
  assert.strictEqual(res.afterRepay.lender, 42);
  assert.strictEqual(res.afterRepay.borrower, 3);
  assert.ok(res.lendEntries.some((e) => e.reason === PointReason.PACT_OUT));
  assert.ok(res.lendEntries.some((e) => e.reason === PointReason.PACT_IN));
  assert.ok(res.repayEntries.some((e) => e.reason === PointReason.PACT_OVERDUE));
});

test('列表只读计提：displayOverdueExtra 不依赖已写库 accrued', () => {
  const today = todayStr();
  const due = addShanghaiDays(today, -3);
  const { displayAccrued, extraDue } = displayOverdueExtra(due, 0, 0, 30, today);
  assert.strictEqual(displayAccrued, 3);
  assert.strictEqual(extraDue, 3);
  // paid 1 → due 2
  const paid = displayOverdueExtra(due, 3, 1, 30, today);
  assert.strictEqual(paid.extraDue, 2);
});

console.log('all passed');
