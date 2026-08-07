import assert from 'node:assert/strict';
import {
  buildFairnessHint,
  hashPeriodKey,
  resolveRotateDutyStudentId,
  sortStudentsForRotate,
} from './rotate-fairness';

assert.equal(hashPeriodKey('2026-07-12'), hashPeriodKey('2026-07-12'));
assert.notEqual(hashPeriodKey('2026-07-12'), hashPeriodKey('2026-07-13'));

const ids = sortStudentsForRotate([
  { id: 3, birthOrder: 2 },
  { id: 1, birthOrder: 1 },
  { id: 2, birthOrder: null },
]).map((s) => s.id);
assert.deepEqual(ids, [1, 3, 2]);

const dutyA = resolveRotateDutyStudentId([10, 20], '2026-07-12');
const dutyB = resolveRotateDutyStudentId([10, 20], '2026-07-12');
assert.equal(dutyA, dutyB);
assert.ok(dutyA === 10 || dutyA === 20);
assert.equal(resolveRotateDutyStudentId([], 'x'), null);

assert.equal(
  buildFairnessHint({
    students: [
      { id: 1, name: '大宝', birthOrder: 1 },
      { id: 2, name: '二宝', birthOrder: 2 },
    ],
    completions: [
      { studentId: 1, count: 5 },
      { studentId: 2, count: 1 },
    ],
  })?.kind,
  'elder_heavy',
);

assert.equal(
  buildFairnessHint({
    students: [
      { id: 1, name: '大宝', birthOrder: 1 },
      { id: 2, name: '二宝', birthOrder: 2 },
    ],
    completions: [
      { studentId: 2, count: 5 },
      { studentId: 1, count: 1 },
    ],
  })?.kind,
  'imbalance',
);

assert.equal(
  buildFairnessHint({
    students: [
      { id: 1, name: '大宝', birthOrder: 1 },
      { id: 2, name: '二宝', birthOrder: 2 },
    ],
    completions: [
      { studentId: 1, count: 2 },
      { studentId: 2, count: 2 },
    ],
  }),
  null,
);

console.log('rotate-fairness.spec.ts ok');
