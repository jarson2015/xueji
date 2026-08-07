import assert from 'node:assert/strict';
import { AssignStatus } from '../common/enums';
import { pickDayArchiveTargets, shouldDayArchive } from './day-archive';

const yesterday = '2026-07-11';
const now = new Date('2026-07-12T10:00:00+08:00');

assert.equal(
  shouldDayArchive(
    {
      id: 1,
      schedule: 'daily',
      status: AssignStatus.ACTIVE,
      progressPercent: 40,
      periodKey: yesterday,
    },
    { makeupEnabled: false, now },
  ),
  true,
);

assert.equal(
  shouldDayArchive(
    {
      id: 1,
      schedule: 'daily',
      status: AssignStatus.ACTIVE,
      progressPercent: 40,
      periodKey: yesterday,
    },
    { makeupEnabled: true, now },
  ),
  false,
  'makeup on → no archive',
);

assert.equal(
  shouldDayArchive(
    {
      id: 1,
      schedule: 'daily',
      status: AssignStatus.ACTIVE,
      progressPercent: 40,
      periodKey: yesterday,
      hasPendingConfirm: true,
    },
    { makeupEnabled: false, now },
  ),
  false,
  'pending confirm exempt',
);

assert.equal(
  shouldDayArchive(
    {
      id: 1,
      schedule: 'daily',
      status: AssignStatus.ACTIVE,
      progressPercent: 40,
      periodKey: yesterday,
      periodWasRestDay: true,
    },
    { makeupEnabled: false, now },
  ),
  false,
  'rest day exempt',
);

assert.equal(
  shouldDayArchive(
    {
      id: 1,
      schedule: 'once',
      status: AssignStatus.ACTIVE,
      progressPercent: 0,
      periodKey: null,
    },
    { makeupEnabled: false, now },
  ),
  false,
);

assert.deepEqual(
  pickDayArchiveTargets(
    [
      {
        id: 1,
        schedule: 'daily',
        status: AssignStatus.ACTIVE,
        progressPercent: 10,
        periodKey: yesterday,
      },
      {
        id: 2,
        schedule: 'daily',
        status: AssignStatus.COMPLETED,
        progressPercent: 100,
        periodKey: yesterday,
      },
    ],
    { makeupEnabled: false, now },
  ).map((r) => r.id),
  [1],
);

console.log('day-archive.spec.ts ok');
