/**
 * Lightweight unit tests (no jest) — run: npm run test:unit
 */
import assert from 'assert';
import {
  calcMakeupPoints,
  isExpiredOnceTask,
  isMakeupWithinWindow,
  shouldBlockNormalCheckinForExpiry,
  shouldAwardPointsNow,
  shouldAutoSettleWeeklyDigest,
  buildRewardFadeHint,
  buildGradualRewardFadeHint,
  resolveRewardFadeHint,
  rewardFadeScheduleNote,
  isEqSourceTemplate,
  resolveMakeupPeriodKey,
  isPeriodRolled,
  resolveMakeupEligibility,
  currentPeriodKey,
  buildGrowthHint,
} from './lifecycle';
import { addShanghaiDays, formatDate } from '../common/date-util';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('task-lifecycle unit tests');

test('calcMakeupPoints floors discount', () => {
  assert.strictEqual(calcMakeupPoints(10, 60), 6);
  assert.strictEqual(calcMakeupPoints(5, 60), 3);
  assert.strictEqual(calcMakeupPoints(10, 100), 10);
});

test('expired once blocks normal checkin', () => {
  const past = '2020-01-01';
  assert.strictEqual(isExpiredOnceTask('once', past), true);
  assert.strictEqual(
    shouldBlockNormalCheckinForExpiry('once', past, false),
    true,
  );
  assert.strictEqual(
    shouldBlockNormalCheckinForExpiry('once', past, true),
    false,
  );
});

test('future deadline not expired', () => {
  const future = addShanghaiDays(formatDate(), 3);
  assert.strictEqual(isExpiredOnceTask('once', future), false);
});

test('makeup window accepts recent day', () => {
  const today = formatDate();
  const recent = addShanghaiDays(today, -2);
  assert.strictEqual(isMakeupWithinWindow(`d:${recent}`, 7), true);
  const old = addShanghaiDays(today, -20);
  assert.strictEqual(isMakeupWithinWindow(`d:${old}`, 7), false);
});

test('makeup window boundary equals windowDays', () => {
  const today = formatDate();
  const edge = addShanghaiDays(today, -7);
  assert.strictEqual(isMakeupWithinWindow(`d:${edge}`, 7), true);
  const beyond = addShanghaiDays(today, -8);
  assert.strictEqual(isMakeupWithinWindow(`d:${beyond}`, 7), false);
});

test('resolveMakeupPeriodKey for expired once', () => {
  assert.strictEqual(
    resolveMakeupPeriodKey('once', undefined, true),
    'once',
  );
});

test('resolveMakeupPeriodKey prefers rolled stored period', () => {
  const today = formatDate();
  const prev = addShanghaiDays(today, -1);
  const key = resolveMakeupPeriodKey('daily', undefined, false, {
    storedPeriod: `d:${prev}`,
    currentKey: `d:${today}`,
  });
  assert.strictEqual(key, `d:${prev}`);
});

test('resolveMakeupPeriodKey returns null when nothing to makeup', () => {
  const today = formatDate();
  const key = resolveMakeupPeriodKey('daily', undefined, false, {
    storedPeriod: `d:${today}`,
    currentKey: `d:${today}`,
  });
  assert.strictEqual(key, null);
});

test('isPeriodRolled detects drift', () => {
  const today = formatDate();
  const prev = addShanghaiDays(today, -1);
  assert.strictEqual(isPeriodRolled('daily', `d:${prev}`), true);
  assert.strictEqual(isPeriodRolled('daily', currentPeriodKey('daily')), false);
  assert.strictEqual(isPeriodRolled('once', 'once'), false);
});

test('resolveMakeupEligibility for rolled incomplete daily', () => {
  const today = formatDate();
  const prev = addShanghaiDays(today, -1);
  const r = resolveMakeupEligibility({
    schedule: 'daily',
    storedPeriod: `d:${prev}`,
    progressPercent: 40,
    status: 'active',
    deadline: null,
    done: false,
  });
  assert.strictEqual(r.rolled, true);
  assert.strictEqual(r.canMakeup, true);
  assert.strictEqual(r.makeupPeriodKey, `d:${prev}`);
});

test('reward modes', () => {
  assert.strictEqual(shouldAwardPointsNow('always'), true);
  assert.strictEqual(shouldAwardPointsNow('weekly_digest'), false);
  assert.strictEqual(shouldAwardPointsNow('random', { randomRoll: 0.1 }), true);
  assert.strictEqual(shouldAwardPointsNow('random', { randomRoll: 0.9 }), false);
});

test('auto settle weekly digest on weekend/monday', () => {
  // 2026-07-11 is Saturday
  assert.strictEqual(
    shouldAutoSettleWeeklyDigest(new Date('2026-07-11T04:00:00+08:00')),
    true,
  );
  // 2026-07-08 is Wednesday
  assert.strictEqual(
    shouldAutoSettleWeeklyDigest(new Date('2026-07-08T12:00:00+08:00')),
    false,
  );
});

test('reward fade hint after 7 days on always', () => {
  const created = new Date('2026-07-01T00:00:00+08:00');
  const now = new Date('2026-07-11T00:00:00+08:00');
  const hint = buildRewardFadeHint('always', created, { now });
  assert.ok(hint?.show);
  assert.strictEqual(hint?.suggestMode, 'random');
  assert.strictEqual(buildRewardFadeHint('random', created, { now }), null);
  const mature = buildRewardFadeHint('always', new Date('2026-06-01T00:00:00+08:00'), {
    now,
  });
  assert.strictEqual(mature?.suggestMode, 'weekly_digest');
});

test('gradual fade hint random to weekly_digest', () => {
  const created = new Date('2026-06-20T00:00:00+08:00');
  const now = new Date('2026-07-11T00:00:00+08:00');
  assert.strictEqual(buildGradualRewardFadeHint('always', created, { now }), null);
  const early = buildGradualRewardFadeHint('random', created, {
    now: new Date('2026-06-25T00:00:00+08:00'),
  });
  assert.strictEqual(early, null);
  const hint = buildGradualRewardFadeHint('random', created, { now });
  assert.ok(hint?.show);
  assert.strictEqual(hint?.suggestMode, 'weekly_digest');
  const resolved = resolveRewardFadeHint('random', created, { now });
  assert.strictEqual(resolved?.suggestMode, 'weekly_digest');
});

test('reward fade schedule note', () => {
  assert.ok(rewardFadeScheduleNote('always')?.includes('有时加分'));
  assert.ok(rewardFadeScheduleNote('random')?.includes('周末一起结算'));
});

test('eq source template detection', () => {
  assert.strictEqual(isEqSourceTemplate('eq-mood'), true);
  assert.strictEqual(isEqSourceTemplate('life-time'), false);
  assert.strictEqual(isEqSourceTemplate(null), false);
});

test('growth hint prefers process over points', () => {
  assert.match(
    buildGrowthHint({ isMakeup: true, ageBand: 'general' }),
    /收了尾/,
  );
  assert.match(
    buildGrowthHint({ usedFocus: true, ageBand: 'young' }),
    /专注/,
  );
  assert.match(
    buildGrowthHint({ streak: 5, ageBand: 'general' }),
    /节奏/,
  );
  assert.match(
    buildGrowthHint({ rewardSkipped: true }),
    /做完本身/,
  );
  assert.match(
    buildGrowthHint({ isInterest: true, ageBand: 'general' }),
    /兴趣|投入/,
  );
});

console.log('all passed');
