/**
 * Lightweight unit tests — run via npm run test:unit
 */
import assert from 'assert';
import {
  shanghaiDayDiff,
  targetOverdueExtra,
  needsParentGate,
  isPactOnTime,
  displayOverdueExtra,
} from './pact-math';
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

console.log('pact-math unit tests');

test('shanghaiDayDiff same day is 0', () => {
  assert.strictEqual(shanghaiDayDiff('2026-07-10', '2026-07-10'), 0);
});

test('shanghaiDayDiff next day is 1', () => {
  assert.strictEqual(shanghaiDayDiff('2026-07-10', '2026-07-11'), 1);
});

test('targetOverdueExtra zero on due date', () => {
  assert.strictEqual(targetOverdueExtra('2026-07-10', 30, '2026-07-10'), 0);
});

test('targetOverdueExtra one day late', () => {
  assert.strictEqual(targetOverdueExtra('2026-07-10', 30, '2026-07-11'), 1);
});

test('targetOverdueExtra caps at max', () => {
  assert.strictEqual(targetOverdueExtra('2026-07-01', 5, '2026-07-20'), 5);
});

test('needsParentGate off when approveAbove is 0', () => {
  assert.strictEqual(needsParentGate(50, 0), false);
});

test('needsParentGate triggers at threshold', () => {
  assert.strictEqual(needsParentGate(20, 20), true);
  assert.strictEqual(needsParentGate(19, 20), false);
});

test('isPactOnTime on due date with no extra', () => {
  assert.strictEqual(isPactOnTime('2026-07-10', 0, '2026-07-10'), true);
});

test('isPactOnTime false when overdue extra', () => {
  assert.strictEqual(isPactOnTime('2026-07-10', 1, '2026-07-10'), false);
});

test('isPactOnTime false after due date', () => {
  assert.strictEqual(isPactOnTime('2026-07-10', 0, '2026-07-11'), false);
});

test('displayOverdueExtra is read-only max of stored and target', () => {
  const today = todayStr();
  const due = addShanghaiDays(today, -4);
  const d = displayOverdueExtra(due, 1, 0, 30, today);
  assert.strictEqual(d.displayAccrued, 4);
  assert.strictEqual(d.extraDue, 4);
});

console.log('all passed');
