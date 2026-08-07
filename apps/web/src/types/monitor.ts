/** GET /dashboard/monitor — parent today board read model */

export type MonitorItemStatus =
  | 'todo'
  | 'in_progress'
  | 'pending_confirm'
  | 'done'
  | 'deferred'

export type MonitorTodayItem = {
  kind: 'task' | 'plan'
  id: number
  title: string
  category: string
  progressPercent: number
  status: MonitorItemStatus
  schedule?: string
  requireConfirm?: boolean
  isRotateDuty?: boolean
  rotateDutyName?: string | null
  updatedAt?: string
  pendingCheckinId?: number | null
  stuckStep?: { id: number; title: string } | null
}

export type MonitorEvent = {
  id: string
  kind: string
  studentId: number
  studentName: string
  at: string
  title: string
  assignId?: number | null
  planItemId?: number | null
  confirmStatus: string
  isMakeup?: boolean
  note?: string | null
}

export type MonitorChild = {
  studentId: number
  name: string
  isRestDay: boolean
  stats: {
    due: number
    done: number
    pendingConfirms: number
    pointsBalance: number
    streak: number
  }
  byCategory: Record<string, { due: number; done: number }>
  todayTasks: MonitorTodayItem[]
  deferredToday?: MonitorTodayItem[]
  timeline?: MonitorEvent[]
  /** compat flat fields from API */
  due?: number
  done?: number
  unfinishedTitles?: string[]
  pointsBalance?: number
  weekTheme?: {
    themeTitle: string
    themePreset: string
    text: string
    weekKey: string
  } | null
  nextWish?: {
    title: string
    costPoints: number
    lackPoints: number
    wishId?: number
    isNearTerm?: boolean
  } | null
}

export type MonitorPendingConfirm = {
  id: number
  studentId: number
  studentName?: string
  taskTitle: string
  note?: string | null
  imageUrl?: string | null
  createdAt: string
  isMakeup?: boolean
  makeupPeriodKey?: string | null
  assignId?: number | null
  planItemId?: number | null
}

export type MonitorPendingProposal = {
  id: number
  studentId: number
  studentName?: string
  title: string
  description?: string | null
  category?: string
  suggestedMinutes?: number | null
  createdAt?: string
}

export type MonitorHints = {
  pactAlert?: { total: number; parentPending?: number; overdue?: number } | null
  rewardFadeHint?: { show?: boolean; message?: string; suggestMode?: string } | null
  fairnessHint?: {
    message?: string
    kind?: string
    dominantName?: string
  } | null
  giftFairnessHint?: { message?: string } | null
  overdueRedeemHint?: { count?: number; message?: string } | null
  parentOverloadHint?: {
    show?: boolean
    message?: string
    suggestions?: string[]
  } | null
  nearWishHint?: {
    message?: string
    studentId?: number
    ready?: boolean
  } | null
  birthOrderHint?: {
    show?: boolean
    message?: string
    missingCount?: number
  } | null
  coachInsights?: Array<{
    kind: string
    message: string
    suggestion: string
  }>
}

export type MonitorResponse = {
  date: string
  lite?: boolean
  family: {
    headline: string
    totalDue: number
    totalDone: number
  }
  children: MonitorChild[]
  pendingConfirms: MonitorPendingConfirm[]
  pendingProposals?: MonitorPendingProposal[]
  hints: MonitorHints
  rewardMode?: string
  /** top-level compat mirrors */
  headline?: string
  totalDue?: number
  totalDone?: number
  pactAlert?: MonitorHints['pactAlert']
  rewardFadeHint?: MonitorHints['rewardFadeHint']
  fairnessHint?: MonitorHints['fairnessHint']
  giftFairnessHint?: MonitorHints['giftFairnessHint']
  overdueRedeemHint?: MonitorHints['overdueRedeemHint']
  parentOverloadHint?: MonitorHints['parentOverloadHint']
  nearWishHint?: MonitorHints['nearWishHint']
  birthOrderHint?: MonitorHints['birthOrderHint']
  coachInsights?: MonitorHints['coachInsights']
}

export type MonitorViewState = MonitorResponse & {
  children: MonitorChild[]
  pendingConfirms: MonitorPendingConfirm[]
  pendingProposals?: MonitorPendingProposal[]
}
