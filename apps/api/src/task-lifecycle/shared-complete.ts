/**
 * Shared-complete helpers — one sibling finishing can archive others' assigns.
 */

import { AssignStatus } from '../common/enums';

export type SiblingAssign = {
  id: number;
  studentId: number;
  status: string;
  progressPercent: number;
  periodKey: string | null;
};

/**
 * Which sibling assigns should become shared_done after completer finishes this period.
 */
export function pickSharedDoneTargets(
  siblings: SiblingAssign[],
  completerAssignId: number,
  periodKey: string,
): SiblingAssign[] {
  return siblings.filter((s) => {
    if (s.id === completerAssignId) return false;
    if (s.status === AssignStatus.COMPLETED && s.progressPercent >= 100) {
      // Already done this period — leave alone
      if (!s.periodKey || s.periodKey === periodKey) return false;
    }
    return true;
  });
}
