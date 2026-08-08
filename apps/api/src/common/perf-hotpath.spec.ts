/**
 * Source guards for PERF P0–P5 hot-path choices.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

const apiSrc = (...p: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

console.log('perf-hotpath unit tests');

test('myTasksForStudents does not load task.steps', () => {
  const src = apiSrc('tasks', 'tasks.service.ts');
  const block = src.slice(
    src.indexOf('async myTasksForStudents'),
    src.indexOf('private applyMakeupGate'),
  );
  assert.ok(block.includes("relations: ['task']"));
  assert.ok(!/relations:\s*\[[^\]]*task\.steps/.test(block));
  assert.ok(block.includes('DAY_ARCHIVED'));
  assert.ok(block.includes('MAX_PER_STUDENT'));
});

test('myTasks does not load task.steps or archive on read', () => {
  const src = apiSrc('tasks', 'tasks.service.ts');
  const start = src.indexOf('async myTasks(');
  const end = src.indexOf('async stepsForStudentAssign');
  const block = src.slice(start, end > 0 ? end : start + 800);
  assert.ok(block.includes("relations: ['task']"));
  assert.ok(!/relations:\s*\[[^\]]*task\.steps/.test(block));
  assert.ok(block.includes('DAY_ARCHIVED'));
  assert.ok(block.includes('take: 100'));
  assert.ok(!block.includes('archiveEndedPeriodsWhenNoMakeup'));
});

test('listForParent batches upgrade hints and skips steps join', () => {
  const src = apiSrc('tasks', 'tasks.service.ts');
  const start = src.indexOf('async listForParent');
  const end = src.indexOf('async getForParent');
  const block = src.slice(start, end > 0 ? end : start + 500);
  assert.ok(!block.includes("'steps'"));
  assert.ok(!block.includes('task.steps'));
  const hints = src.slice(
    src.indexOf('private async withUpgradeHints'),
    src.indexOf('async create('),
  );
  assert.ok(hints.includes('batchStreaks'));
  assert.ok(!hints.includes('streakForTask'));
});

test('confirmBatch batch-loads and parallels by student', () => {
  const src = apiSrc('checkins', 'checkins.service.ts');
  const block = src.slice(
    src.indexOf('async confirmBatch'),
    src.indexOf('async listForParent'),
  );
  assert.ok(block.includes('In(uniqueIds)'));
  assert.ok(block.includes('forStudents'));
  assert.ok(block.includes('skipBoundCheck'));
  assert.ok(block.includes('byStudent'));
  assert.ok(block.includes('CONCURRENCY'));
});

test('monitor coach assigns use skipDate filter', () => {
  const src = apiSrc('dashboard', 'dashboard.service.ts');
  assert.ok(src.includes('deferSinceKey'));
  assert.ok(src.includes("select: ['id', 'studentId', 'skipDate']"));
});

test('monitor pending uses narrow select then detail top-20', () => {
  const src = apiSrc('dashboard', 'dashboard.service.ts');
  assert.ok(src.includes("select: ["));
  assert.ok(src.includes("'assignId'"));
  assert.ok(src.includes('pendingDetailById') || src.includes('pendingTop'));
});

test('todayItemsForStudents filters in SQL', () => {
  const src = apiSrc('plans', 'plans.service.ts');
  const block = src.slice(
    src.indexOf('async todayItemsForStudents'),
    src.indexOf('private async getOwned'),
  );
  assert.ok(block.includes('createQueryBuilder'));
  assert.ok(block.includes('plannedDate'));
  assert.ok(!block.includes("relations: ['items', 'items.task']"));
});

test('buildToday does not settleWeeklyDigest on read', () => {
  const src = apiSrc('dashboard', 'dashboard.service.ts');
  const end = src.indexOf('\n  async ', src.indexOf('private async buildToday') + 10);
  const today = src.slice(
    src.indexOf('private async buildToday'),
    end > 0 ? end : src.indexOf('async monitor'),
  );
  assert.ok(!today.includes('settleWeeklyDigest'));
  assert.ok(today.includes('纯读') || today.includes('digestSettlement'));
});

test('migration 0039–0042 indexes present', () => {
  assert.ok(
    apiSrc('migrations', '1740000000039-CheckinAssignIndexes.ts').includes(
      'IDX_checkins_student_created',
    ),
  );
  assert.ok(
    apiSrc(
      'migrations',
      '1740000000040-WishRedeemAssignStatusIndexes.ts',
    ).includes('IDX_wish_redeems_student_status_created'),
  );
  assert.ok(
    apiSrc('migrations', '1740000000041-PlanItemJournalIndexes.ts').includes(
      'IDX_plan_items_plan_planned',
    ),
  );
  assert.ok(
    apiSrc('migrations', '1740000000042-LedgerWishGiftIndexes.ts').includes(
      'IDX_point_ledgers_student_created',
    ),
  );
});

test('day-archive scheduler exists', () => {
  const src = apiSrc('tasks', 'day-archive.scheduler.ts');
  assert.ok(src.includes('DayArchiveScheduler'));
  assert.ok(src.includes('archiveEndedPeriodsWhenNoMakeup'));
});

test('parent wishes/redeems are capped', () => {
  const src = apiSrc('wishes', 'wishes.service.ts');
  const wishes = src.slice(
    src.indexOf('async listForParent'),
    src.indexOf('async listForStudent'),
  );
  assert.ok(wishes.includes('take: 100'));
  const redeems = src.slice(
    src.indexOf('async listRedeems('),
    src.indexOf('async listRedeemsForStudent'),
  );
  assert.ok(redeems.includes('take: 50'));
  assert.ok(redeems.includes('RedeemStatus.PENDING'));
});

test('weekly report does not settle on GET', () => {
  const src = apiSrc('reports', 'reports.service.ts');
  const block = src.slice(
    src.indexOf('async weekly('),
    src.indexOf('private async buildHabitStreaks'),
  );
  assert.ok(!block.includes('settleWeeklyDigest'));
  assert.ok(block.includes('portfolioStats'));
  assert.ok(block.includes('.take(400)'));
  assert.ok(block.includes('createQueryBuilder'));
  assert.ok(block.includes('task.active'));
  assert.ok(block.includes('streaksForStudents'));
  assert.ok(!block.includes("relations: ['task']"));
});

test('progress reuses myTasksForStudents', () => {
  const src = apiSrc('dashboard', 'dashboard.service.ts');
  const block = src.slice(
    src.indexOf('async progress('),
    src.indexOf('async today('),
  );
  assert.ok(block.includes('myTasksForStudents'));
  assert.ok(!block.includes('task.steps'));
});

test('push sends in parallel', () => {
  const src = apiSrc('push', 'push.service.ts');
  assert.ok(src.includes('Promise.allSettled'));
});

test('summary is thin wrap of monitor lite', () => {
  const src = apiSrc('dashboard', 'dashboard.service.ts');
  const block = src.slice(
    src.indexOf('async summary('),
    src.indexOf('async monitor('),
  );
  assert.ok(block.includes("lite: true"));
  assert.ok(block.includes('this.monitor('));
  assert.ok(!block.includes('myTasksForStudents'));
  assert.ok(!block.includes('buildSharedFairnessHint'));
});

test('plans.list caps plans and filters items', () => {
  const src = apiSrc('plans', 'plans.service.ts');
  const block = src.slice(
    src.indexOf('async list('),
    src.indexOf('async create('),
  );
  assert.ok(block.includes('take: 30'));
  assert.ok(block.includes('createQueryBuilder'));
  assert.ok(block.includes('plannedDate'));
  assert.ok(!block.includes("relations: ['items', 'items.task']"));
});

console.log('all passed');
