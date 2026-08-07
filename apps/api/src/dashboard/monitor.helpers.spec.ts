/**
 * Lightweight unit tests — run via: npx ts-node -r tsconfig-paths/register src/dashboard/monitor.helpers.spec.ts
 */
import assert from 'assert';
import {
  bumpCategory,
  buildChildTimeline,
  computeStuckStep,
  emptyByCategory,
  isTaskDueToday,
  resolvePlanStatus,
  resolveTaskStatus,
  sortMonitorItems,
  timelineKindFromCheckin,
} from './monitor.helpers';
import { ConfirmStatus } from '../common/enums';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('monitor.helpers unit tests');

const pause = { pauseAll: false, pauseCategories: ['study'] };

test('isTaskDueToday excludes deferred and rotate skip', () => {
  assert.strictEqual(isTaskDueToday({ deferredToday: true }, false, pause), false);
  assert.strictEqual(
    isTaskDueToday({ rotateSkipToday: true, isExpired: false }, false, pause),
    false,
  );
});

test('resolveTaskStatus prioritizes pending_confirm', () => {
  assert.strictEqual(resolveTaskStatus({ progressPercent: 50 }, 9), 'pending_confirm');
  assert.strictEqual(resolveTaskStatus({ progressPercent: 100 }, null), 'done');
  assert.strictEqual(resolveTaskStatus({ progressPercent: 40 }, null), 'in_progress');
});

test('sortMonitorItems puts pending first', () => {
  const sorted = sortMonitorItems([
    {
      kind: 'task',
      id: 1,
      title: 'b',
      category: 'study',
      progressPercent: 0,
      status: 'todo',
    },
    {
      kind: 'task',
      id: 2,
      title: 'a',
      category: 'study',
      progressPercent: 50,
      status: 'pending_confirm',
    },
  ]);
  assert.strictEqual(sorted[0].status, 'pending_confirm');
});

test('timelineKindFromCheckin maps confirm status', () => {
  assert.strictEqual(
    timelineKindFromCheckin({ confirmStatus: ConfirmStatus.PENDING }),
    'checkin_submitted',
  );
  assert.strictEqual(
    timelineKindFromCheckin({ confirmStatus: ConfirmStatus.APPROVED }),
    'checkin_approved',
  );
});

test('bumpCategory aggregates due/done', () => {
  const cat = emptyByCategory();
  bumpCategory(cat, 'chore', false);
  bumpCategory(cat, 'chore', true);
  assert.deepStrictEqual(cat.chore, { due: 2, done: 1 });
});

test('resolvePlanStatus', () => {
  assert.strictEqual(resolvePlanStatus(false, 1), 'pending_confirm');
  assert.strictEqual(resolvePlanStatus(true, null), 'done');
});

test('timelineKindFromCheckin detects plan_completed', () => {
  assert.strictEqual(
    timelineKindFromCheckin({
      confirmStatus: ConfirmStatus.NONE,
      planItemId: 3,
      assignId: null,
    }),
    'plan_completed',
  );
});

test('computeStuckStep picks step from progress', () => {
  const step = computeStuckStep(
    [
      { id: 1, title: '第一步', sortOrder: 0 },
      { id: 2, title: '第二步', sortOrder: 1 },
    ],
    50,
  );
  assert.strictEqual(step?.title, '第二步');
  assert.strictEqual(computeStuckStep([], 50), null);
  assert.strictEqual(computeStuckStep([{ id: 1, title: 'A' }], 100), null);
});

test('buildChildTimeline merges checkins redeems and deferred', () => {
  const rows = buildChildTimeline({
    studentId: 1,
    studentName: '小明',
    checkins: [
      {
        id: 1,
        studentId: 1,
        assignId: 10,
        planItemId: null,
        confirmStatus: ConfirmStatus.APPROVED,
        createdAt: new Date('2026-07-14T12:00:00+08:00'),
        task: { title: '数学' },
      },
    ],
    redeems: [
      {
        id: 2,
        studentId: 1,
        costPoints: 50,
        createdAt: new Date('2026-07-14T11:00:00+08:00'),
        wish: { title: '乐高' },
      },
    ],
    deferredTasks: [{ assignId: 11, title: '练琴' }],
    planTitleById: new Map(),
    dateKey: '2026-07-14',
    limit: 12,
  });
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0].kind, 'checkin_approved');
  assert.ok(rows.some((r) => r.kind === 'redeem_requested'));
  assert.ok(rows.some((r) => r.kind === 'deferred_today'));
});

console.log('monitor.helpers: all passed');
