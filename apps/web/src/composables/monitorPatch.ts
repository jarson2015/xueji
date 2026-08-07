import type {
  MonitorChild,
  MonitorEvent,
  MonitorItemStatus,
  MonitorPendingConfirm,
  MonitorResponse,
  MonitorTodayItem,
} from '../types/monitor'

export type CheckinCreatedPayload = {
  checkin: {
    id: number
    studentId: number
    studentName?: string
    taskId?: number | null
    assignId?: number | null
    planItemId?: number | null
    taskTitle?: string
    note?: string | null
    imageUrl?: string | null
    confirmStatus: string
    isMakeup?: boolean
    createdAt: string | Date
  }
  progress?: ProgressChangedPayload | null
}

export type ProgressChangedPayload = {
  assignId: number
  studentId: number
  taskId?: number
  progressValue?: number
  progressPercent?: number
  status?: string
  pointsAwarded?: number
  deferredToday?: boolean
  title?: string
}

export type CheckinReviewedPayload = {
  checkinId: number
  studentId: number
  assignId?: number | null
  planItemId?: number | null
  taskTitle?: string
  action: 'approve' | 'reject'
  confirmStatus: string
  isMakeup?: boolean
  at: string | Date
  progress?: ProgressChangedPayload | null
}

export type NudgeSentPayload = {
  studentId: number
  message: string
  fromName?: string
  at: string
}

export type RedeemRequestedPayload = {
  redeem: {
    id: number
    studentId: number
    costPoints?: number
    createdAt?: string | Date
  }
  wish?: { title?: string } | null
  studentName?: string
}

const STATUS_RANK: Record<MonitorItemStatus, number> = {
  pending_confirm: 0,
  in_progress: 1,
  todo: 2,
  done: 3,
  deferred: 4,
}

function toIso(v: string | Date) {
  return typeof v === 'string' ? v : new Date(v).toISOString()
}

function resolveTaskStatus(
  progressPercent: number,
  status?: string,
  pendingCheckinId?: number | null,
): MonitorItemStatus {
  if (pendingCheckinId) return 'pending_confirm'
  if (progressPercent >= 100 || status === 'completed') return 'done'
  if (progressPercent > 0) return 'in_progress'
  return 'todo'
}

function resolvePlanStatus(done: boolean, pendingCheckinId?: number | null): MonitorItemStatus {
  if (pendingCheckinId) return 'pending_confirm'
  if (done) return 'done'
  return 'todo'
}

function sortTasks(items: MonitorTodayItem[]) {
  return [...items].sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 9
    const rb = STATUS_RANK[b.status] ?? 9
    if (ra !== rb) return ra - rb
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    if (ta !== tb) return tb - ta
    return a.title.localeCompare(b.title, 'zh-CN')
  })
}

export function mergeTimelines(
  prev: MonitorEvent[] | undefined,
  next: MonitorEvent[] | undefined,
  limit = 8,
): MonitorEvent[] {
  const map = new Map<string, MonitorEvent>()
  for (const ev of [...(prev || []), ...(next || [])]) {
    if (!map.has(ev.id)) map.set(ev.id, ev)
  }
  return [...map.values()]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

function findChild(monitor: MonitorResponse, studentId: number) {
  return monitor.children.find((c) => c.studentId === studentId)
}

function syncChildStats(child: MonitorChild, pendingConfirms: MonitorPendingConfirm[]) {
  const tasks = child.todayTasks || []
  child.stats.due = tasks.length
  child.stats.done = tasks.filter((t) => t.status === 'done').length
  child.stats.pendingConfirms = pendingConfirms.filter(
    (p) => p.studentId === child.studentId,
  ).length
  child.due = child.stats.due
  child.done = child.stats.done
  child.unfinishedTitles = tasks
    .filter((t) => t.status !== 'done')
    .map((t) => t.title)
    .slice(0, 5)
}

export function syncFamilySummary(monitor: MonitorResponse) {
  let totalDue = 0
  let totalDone = 0
  for (const c of monitor.children) {
    totalDue += c.stats.due
    totalDone += c.stats.done
  }
  monitor.family.totalDue = totalDue
  monitor.family.totalDone = totalDone
  monitor.totalDue = totalDue
  monitor.totalDone = totalDone
  const base = `今天完成 ${totalDone}/${totalDue || 0}`
  monitor.family.headline = base
  monitor.headline = base
}

function prependTimeline(child: MonitorChild, event: MonitorEvent) {
  child.timeline = mergeTimelines([event], child.timeline)
}

function timelineFromCheckin(
  checkin: CheckinCreatedPayload['checkin'],
  kind: string,
): MonitorEvent {
  const at = toIso(checkin.createdAt)
  const resolvedKind =
    kind ||
    (checkin.planItemId &&
    !checkin.assignId &&
    checkin.confirmStatus !== 'pending' &&
    checkin.confirmStatus !== 'rejected'
      ? 'plan_completed'
      : kind)
  return {
    id: `${resolvedKind}:${checkin.id}`,
    kind: resolvedKind,
    studentId: checkin.studentId,
    studentName: checkin.studentName || '',
    at,
    title: checkin.taskTitle || '计划完成',
    assignId: checkin.assignId,
    planItemId: checkin.planItemId,
    confirmStatus: checkin.confirmStatus as MonitorEvent['confirmStatus'],
    isMakeup: checkin.isMakeup,
    note: checkin.note,
  }
}

function upsertPending(monitor: MonitorResponse, row: MonitorPendingConfirm) {
  if (monitor.pendingConfirms.some((p) => p.id === row.id)) return
  monitor.pendingConfirms = [row, ...monitor.pendingConfirms].slice(0, 20)
}

function removePending(monitor: MonitorResponse, checkinId: number) {
  monitor.pendingConfirms = monitor.pendingConfirms.filter((p) => p.id !== checkinId)
}

function patchTaskItem(
  child: MonitorChild,
  assignId: number,
  patch: Partial<MonitorTodayItem>,
) {
  const idx = child.todayTasks.findIndex((t) => t.kind === 'task' && t.id === assignId)
  if (idx < 0) return false
  child.todayTasks[idx] = { ...child.todayTasks[idx], ...patch }
  child.todayTasks = sortTasks(child.todayTasks)
  return true
}

function patchPlanItem(
  child: MonitorChild,
  planItemId: number,
  patch: Partial<MonitorTodayItem>,
) {
  const idx = child.todayTasks.findIndex((t) => t.kind === 'plan' && t.id === planItemId)
  if (idx < 0) return false
  child.todayTasks[idx] = { ...child.todayTasks[idx], ...patch }
  child.todayTasks = sortTasks(child.todayTasks)
  return true
}

export function patchProgressChanged(
  monitor: MonitorResponse,
  payload: ProgressChangedPayload,
): boolean {
  const child = findChild(monitor, payload.studentId)
  if (!child) return false

  if (payload.deferredToday) {
    const idx = child.todayTasks.findIndex(
      (t) => t.kind === 'task' && t.id === payload.assignId,
    )
    const title = payload.title || child.todayTasks[idx]?.title || '任务'
    if (idx >= 0) {
      const row = child.todayTasks[idx]
      child.todayTasks.splice(idx, 1)
      const deferred: MonitorTodayItem = {
        ...row,
        status: 'deferred',
        pendingCheckinId: null,
      }
      child.deferredToday = [...(child.deferredToday || []), deferred]
    }
    prependTimeline(child, {
      id: `deferred_today:${payload.assignId}`,
      kind: 'deferred_today',
      studentId: payload.studentId,
      studentName: child.name,
      at: new Date().toISOString(),
      title,
      assignId: payload.assignId,
      confirmStatus: 'none',
    })
    syncChildStats(child, monitor.pendingConfirms)
    syncFamilySummary(monitor)
    return true
  }

  const pending = child.todayTasks.find(
    (t) => t.kind === 'task' && t.id === payload.assignId,
  )?.pendingCheckinId

  const percent = payload.progressPercent ?? 0
  const status = resolveTaskStatus(percent, payload.status, pending)
  const updatedAt = new Date().toISOString()

  const patched = patchTaskItem(child, payload.assignId, {
    progressPercent: percent,
    status,
    updatedAt,
    title: payload.title || undefined,
  })

  if (patched) {
    syncChildStats(child, monitor.pendingConfirms)
    syncFamilySummary(monitor)
  }
  return patched
}

export function patchCheckinCreated(
  monitor: MonitorResponse,
  payload: CheckinCreatedPayload,
): boolean {
  const { checkin, progress } = payload
  const child = findChild(monitor, checkin.studentId)
  if (!child) return false

  const at = toIso(checkin.createdAt)
  const isPending = checkin.confirmStatus === 'pending'

  if (isPending) {
    upsertPending(monitor, {
      id: checkin.id,
      studentId: checkin.studentId,
      studentName: checkin.studentName,
      taskTitle: checkin.taskTitle || '计划完成',
      note: checkin.note,
      imageUrl: checkin.imageUrl,
      createdAt: at,
      isMakeup: checkin.isMakeup,
      assignId: checkin.assignId,
      planItemId: checkin.planItemId,
    })
  }

  if (checkin.assignId) {
    patchTaskItem(child, checkin.assignId, {
      status: isPending
        ? 'pending_confirm'
        : child.todayTasks.find((t) => t.id === checkin.assignId)?.status || 'todo',
      pendingCheckinId: isPending ? checkin.id : null,
      updatedAt: at,
    })
  } else if (checkin.planItemId) {
    patchPlanItem(child, checkin.planItemId, {
      status: isPending ? 'pending_confirm' : 'todo',
      pendingCheckinId: isPending ? checkin.id : null,
      updatedAt: at,
    })
  }

  if (progress) {
    patchProgressChanged(monitor, progress)
  }

  const kind = isPending
    ? 'checkin_submitted'
    : checkin.planItemId && !checkin.assignId
      ? 'plan_completed'
      : checkin.isMakeup
        ? 'checkin_submitted'
        : 'checkin_auto'
  prependTimeline(child, timelineFromCheckin(checkin, kind))

  syncChildStats(child, monitor.pendingConfirms)
  syncFamilySummary(monitor)
  return true
}

export function patchCheckinReviewed(
  monitor: MonitorResponse,
  payload: CheckinReviewedPayload,
): boolean {
  const child = findChild(monitor, payload.studentId)
  if (!child) return false

  removePending(monitor, payload.checkinId)

  const at = toIso(payload.at)
  const kind = payload.action === 'approve' ? 'checkin_approved' : 'checkin_rejected'

  if (payload.assignId) {
    const existing = child.todayTasks.find(
      (t) => t.kind === 'task' && t.id === payload.assignId,
    )
    const percent = payload.progress?.progressPercent
    const status =
      payload.action === 'reject'
        ? resolveTaskStatus(existing?.progressPercent || 0, payload.progress?.status, null)
        : resolveTaskStatus(
            percent ?? (payload.action === 'approve' ? 100 : 0),
            payload.progress?.status,
            null,
          )
    patchTaskItem(child, payload.assignId, {
      pendingCheckinId: null,
      progressPercent: percent ?? existing?.progressPercent,
      status,
      updatedAt: at,
    })
  } else if (payload.planItemId) {
    patchPlanItem(child, payload.planItemId, {
      pendingCheckinId: null,
      status: payload.action === 'approve' ? 'done' : resolvePlanStatus(false, null),
      progressPercent: payload.action === 'approve' ? 100 : 0,
      updatedAt: at,
    })
  }

  if (payload.progress) {
    patchProgressChanged(monitor, payload.progress)
  }

  prependTimeline(child, {
    id: `${kind}:${payload.checkinId}`,
    kind,
    studentId: payload.studentId,
    studentName: child.name,
    at,
    title: payload.taskTitle || '计划完成',
    assignId: payload.assignId,
    planItemId: payload.planItemId,
    confirmStatus: payload.confirmStatus as MonitorEvent['confirmStatus'],
    isMakeup: payload.isMakeup,
  })

  syncChildStats(child, monitor.pendingConfirms)
  syncFamilySummary(monitor)
  return true
}

export function patchNudgeSent(monitor: MonitorResponse, payload: NudgeSentPayload): boolean {
  const child = findChild(monitor, payload.studentId)
  if (!child) return false
  const at = toIso(payload.at)
  prependTimeline(child, {
    id: `nudge_sent:${payload.studentId}:${at}`,
    kind: 'nudge_sent',
    studentId: payload.studentId,
    studentName: child.name,
    at,
    title: payload.fromName ? `${payload.fromName}提醒` : '轻轻提醒',
    confirmStatus: 'none',
    note: payload.message,
  })
  return true
}

export function patchRedeemRequested(
  monitor: MonitorResponse,
  payload: RedeemRequestedPayload,
): boolean {
  const child = findChild(monitor, payload.redeem.studentId)
  if (!child) return false
  const at = payload.redeem.createdAt
    ? toIso(payload.redeem.createdAt)
    : new Date().toISOString()
  prependTimeline(child, {
    id: `redeem_requested:${payload.redeem.id}`,
    kind: 'redeem_requested',
    studentId: payload.redeem.studentId,
    studentName: payload.studentName || child.name,
    at,
    title: payload.wish?.title || '愿望',
    confirmStatus: 'none',
    note: payload.redeem.costPoints ? `${payload.redeem.costPoints} 积分` : null,
  })
  return true
}
