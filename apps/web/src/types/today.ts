/** Shared shapes for /my/today and /my/today/lite */

export type TodayEncouragement = {
  message: string
  fromLabel: string
  at: string
}

export type TodayLatestRepair = {
  message: string
  fromLabel: string
  taskTitle?: string
  at: string
}

export type TodaySoftNudge = {
  message: string
  count: number
  kind: string
}

export type TodayMakeupHint = {
  assignId: number
  title: string
  schedule?: string
  category?: string
  hint?: string
  isExpired?: boolean
  makeupPeriodKey?: string
  pointsReward?: number
  makeupPoints?: number
}

export type TodayPactHints = {
  enabled?: boolean
  summary?: string
  openCount?: number
  overdue?: number
  awaitMyAccept?: number
  awaitParent?: number
  dueSoon?: number
  focus?: string
} | null

/** Reactive board state used by TodayView (tasks stay loosely typed for list mapping) */
export type TodayBoardState = {
  tasks: any[]
  planItems: any[]
  deferredToday?: any[]
  streak: number
  nextWish: any
  pointsBalance: number
  rewardMode: string
  isRestDay: boolean
  restPauseAll: boolean
  restPauseCategories: string[]
  softNudge: TodaySoftNudge | null
  latestEncouragement: TodayEncouragement | null
  latestRepair?: TodayLatestRepair | null
  sharedDoneHints: any[]
  rotateHints: any[]
  pactHints: TodayPactHints
  makeupHints: TodayMakeupHint[]
  makeupEnabled: boolean
  makeupDiscountPercent: number
  dailySkipLimit: number
  skipsUsedToday: number
  digestSettlement: { points: number; settled: number } | null
}

/** Core board fields present on both full and lite payloads */
export type TodayBoardCore = {
  lite?: boolean
  tasks: unknown[]
  planItems: unknown[]
  deferredToday?: unknown[]
  streak: number
  nextWish: unknown
  pointsBalance: number
  rewardMode?: string
  isRestDay: boolean
  restPauseAll?: boolean
  restPauseCategories?: string[]
  softNudge: TodaySoftNudge | null
  sharedDoneHints?: unknown[]
  rotateHints?: unknown[]
  pactHints?: TodayPactHints
  makeupHints?: TodayMakeupHint[]
  makeupEnabled?: boolean
  makeupDiscountPercent?: number
  dailySkipLimit?: number
  skipsUsedToday?: number
  ageBand?: string
  slotExtendedEnabled?: boolean
  slotClockEffective?: Record<
    string,
    { startHour: number; endHour: number }
  > | null
  reflectionEnabled?: boolean
  reflectionPrompt?: string | null
}

export type TodayBoardFull = TodayBoardCore & {
  latestEncouragement: TodayEncouragement | null
  latestRepair?: TodayLatestRepair | null
  digestSettlement: { points: number; settled: number } | null
}

export type DashboardSummary = {
  headline?: string
  totalDue?: number
  totalDone?: number
  children?: unknown[]
  pendingConfirms?: Array<{
    id: number
    isMakeup?: boolean
    [k: string]: unknown
  }>
  rewardMode?: string
  rewardFadeHint?: { suggestMode?: string } | null
  fairnessHint?: {
    message?: string
    kind?: string
    dominantName?: string
  } | null
}
