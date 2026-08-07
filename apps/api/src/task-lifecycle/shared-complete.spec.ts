import assert from 'node:assert/strict';
import { AssignStatus } from '../common/enums';
import { pickSharedDoneTargets } from './shared-complete';

const base = {
  progressPercent: 0,
  periodKey: '2026-07-12' as string | null,
  status: AssignStatus.ACTIVE,
};

assert.deepEqual(
  pickSharedDoneTargets(
    [
      { id: 1, studentId: 1, ...base },
      { id: 2, studentId: 2, ...base },
      { id: 3, studentId: 3, ...base, status: AssignStatus.COMPLETED, progressPercent: 100 },
    ],
    1,
    '2026-07-12',
  ).map((s) => s.id),
  [2],
);

assert.deepEqual(
  pickSharedDoneTargets(
    [
      { id: 1, studentId: 1, ...base },
      {
        id: 2,
        studentId: 2,
        ...base,
        status: AssignStatus.SHARED_DONE,
        periodKey: '2026-07-11',
      },
    ],
    1,
    '2026-07-12',
  ).map((s) => s.id),
  [2],
);

console.log('shared-complete.spec.ts ok');
