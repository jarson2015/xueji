/**
 * Day-end archive when family disables makeup — soft stop nudging for rolled periods.
 */

import { AssignStatus } from '../common/enums';
import { isPeriodRolled } from './lifecycle';

export type DayArchiveCandidate = {
  id: number;
  schedule: string;
  status: string;
  progressPercent: number;
  periodKey: string | null;
  /** Calendar day of periodKey is a rest day (daily only) */
  periodWasRestDay?: boolean;
  /** Has checkin awaiting parent confirm */
  hasPendingConfirm?: boolean;
};

/**
 * Whether this assign should be day-archived now (makeup off + period rolled).
 */
export function shouldDayArchive(
  row: DayArchiveCandidate,
  opts: { makeupEnabled: boolean; now?: Date },
): boolean {
  if (opts.makeupEnabled) return false;
  if (row.schedule === 'once') return false;
  if (row.progressPercent >= 100) return false;
  if (
    row.status === AssignStatus.COMPLETED ||
    row.status === AssignStatus.CLOSED ||
    row.status === AssignStatus.SHARED_DONE ||
    row.status === AssignStatus.DAY_ARCHIVED
  ) {
    return false;
  }
  if (row.hasPendingConfirm) return false;
  if (row.schedule === 'daily' && row.periodWasRestDay) return false;
  if (!row.periodKey) return false;
  if (!isPeriodRolled(row.schedule, row.periodKey, opts.now)) return false;
  return row.status === AssignStatus.ACTIVE || row.status === 'active';
}

export function pickDayArchiveTargets(
  rows: DayArchiveCandidate[],
  opts: { makeupEnabled: boolean; now?: Date },
): DayArchiveCandidate[] {
  return rows.filter((r) => shouldDayArchive(r, opts));
}
