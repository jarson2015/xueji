import { ConfirmStatus } from '../common/enums';
import { showsOnRestDay, type RestPausePolicy } from '../common/rest-day-policy';

export type MonitorItemStatus =
  | 'todo'
  | 'in_progress'
  | 'pending_confirm'
  | 'done'
  | 'deferred';

export type MonitorTodayItem = {
  kind: 'task' | 'plan';
  id: number;
  title: string;
  category: string;
  progressPercent: number;
  status: MonitorItemStatus;
  schedule?: string;
  requireConfirm?: boolean;
  isRotateDuty?: boolean;
  rotateDutyName?: string | null;
  updatedAt?: string;
  pendingCheckinId?: number | null;
  stuckStep?: { id: number; title: string } | null;
};

const STATUS_RANK: Record<MonitorItemStatus, number> = {
  pending_confirm: 0,
  in_progress: 1,
  todo: 2,
  done: 3,
  deferred: 4,
};

/** Current step hint for multi-step tasks (full monitor only) */
export function computeStuckStep(
  steps: Array<{ id: number; title: string; sortOrder?: number }> | undefined,
  progressPercent: number,
): { id: number; title: string } | null {
  if (!steps?.length || progressPercent >= 100) return null;
  const sorted = [...steps].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((progressPercent / 100) * sorted.length),
  );
  const step = sorted[idx];
  return step ? { id: step.id, title: step.title } : null;
}

/** Same inclusion rules as dashboard.summary / buildToday todayTasks */
export function isTaskDueToday(
  t: {
    deferredToday?: boolean;
    isExpired?: boolean;
    sharedDone?: boolean;
    status?: string;
    dayArchived?: boolean;
    rotateSkipToday?: boolean;
    schedule?: string;
    category?: string;
  },
  isRestDay: boolean,
  pause: RestPausePolicy,
): boolean {
  if (t.deferredToday) return false;
  if (t.isExpired) return false;
  if (t.sharedDone || t.status === 'shared_done') return false;
  if (t.dayArchived || t.status === 'day_archived') return false;
  if (t.rotateSkipToday) return false;
  if (isRestDay && !showsOnRestDay({ schedule: t.schedule || 'daily', category: t.category }, pause)) return false;
  return true;
}

export function resolveTaskStatus(
  t: { progressPercent: number; status?: string },
  pendingCheckinId?: number | null,
): MonitorItemStatus {
  if (pendingCheckinId) return 'pending_confirm';
  if (t.progressPercent >= 100 || t.status === 'completed') return 'done';
  if (t.progressPercent > 0) return 'in_progress';
  return 'todo';
}

export function resolvePlanStatus(
  done: boolean,
  pendingCheckinId?: number | null,
): MonitorItemStatus {
  if (pendingCheckinId) return 'pending_confirm';
  if (done) return 'done';
  return 'todo';
}

export function sortMonitorItems(items: MonitorTodayItem[]): MonitorTodayItem[] {
  return [...items].sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 9;
    const rb = STATUS_RANK[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (ta !== tb) return tb - ta;
    return a.title.localeCompare(b.title, 'zh-CN');
  });
}

export function emptyByCategory() {
  return {
    study: { due: 0, done: 0 },
    chore: { due: 0, done: 0 },
    routine: { due: 0, done: 0 },
    eq: { due: 0, done: 0 },
  };
}

export function bumpCategory(
  byCategory: ReturnType<typeof emptyByCategory>,
  category: string | undefined,
  isDone: boolean,
) {
  const key = (category || 'study') as keyof ReturnType<typeof emptyByCategory>;
  const bucket = byCategory[key] || byCategory.study;
  bucket.due += 1;
  if (isDone) bucket.done += 1;
}

export function timelineKindFromCheckin(c: {
  confirmStatus: ConfirmStatus;
  isMakeup?: boolean;
  planItemId?: number | null;
  assignId?: number | null;
}): string {
  if (
    c.planItemId &&
    !c.assignId &&
    c.confirmStatus !== ConfirmStatus.PENDING &&
    c.confirmStatus !== ConfirmStatus.REJECTED
  ) {
    return 'plan_completed';
  }
  if (c.confirmStatus === ConfirmStatus.PENDING) return 'checkin_submitted';
  if (c.confirmStatus === ConfirmStatus.APPROVED) return 'checkin_approved';
  if (c.confirmStatus === ConfirmStatus.REJECTED) return 'checkin_rejected';
  return c.isMakeup ? 'checkin_submitted' : 'checkin_auto';
}

export type MonitorTimelineEvent = {
  id: string;
  kind: string;
  studentId: number;
  studentName: string;
  at: string;
  title: string;
  assignId?: number | null;
  planItemId?: number | null;
  confirmStatus: string;
  isMakeup?: boolean;
  note?: string | null;
};

export function buildChildTimeline(opts: {
  studentId: number;
  studentName: string;
  checkins: Array<{
    id: number;
    studentId: number;
    assignId?: number | null;
    planItemId?: number | null;
    confirmStatus: ConfirmStatus;
    isMakeup?: boolean;
    note?: string | null;
    createdAt: Date;
    task?: { title?: string } | null;
  }>;
  redeems: Array<{
    id: number;
    studentId: number;
    costPoints?: number;
    createdAt: Date;
    wish?: { title?: string } | null;
  }>;
  deferredTasks: Array<{ assignId: number; title: string }>;
  planTitleById: Map<number, string>;
  dateKey: string;
  limit?: number;
}): MonitorTimelineEvent[] {
  const events: MonitorTimelineEvent[] = [];

  for (const c of opts.checkins) {
    const kind = timelineKindFromCheckin(c);
    events.push({
      id: `${kind}:${c.id}`,
      kind,
      studentId: opts.studentId,
      studentName: opts.studentName,
      at: new Date(c.createdAt).toISOString(),
      title:
        c.task?.title ||
        (c.planItemId ? opts.planTitleById.get(c.planItemId) : null) ||
        '计划完成',
      assignId: c.assignId,
      planItemId: c.planItemId,
      confirmStatus: c.confirmStatus,
      isMakeup: !!c.isMakeup,
      note: c.note,
    });
  }

  for (const r of opts.redeems) {
    events.push({
      id: `redeem_requested:${r.id}`,
      kind: 'redeem_requested',
      studentId: opts.studentId,
      studentName: opts.studentName,
      at: new Date(r.createdAt).toISOString(),
      title: r.wish?.title || '愿望',
      confirmStatus: 'none',
      note: r.costPoints ? `${r.costPoints} 积分` : null,
    });
  }

  for (const d of opts.deferredTasks) {
    events.push({
      id: `deferred_today:${d.assignId}`,
      kind: 'deferred_today',
      studentId: opts.studentId,
      studentName: opts.studentName,
      at: `${opts.dateKey}T08:00:00+08:00`,
      title: d.title,
      assignId: d.assignId,
      confirmStatus: 'none',
    });
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, opts.limit ?? 12);
}
