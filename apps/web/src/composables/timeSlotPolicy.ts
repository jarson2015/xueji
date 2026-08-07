/**
 * 学生端时段窗口策略：降低「全天清单」焦虑，按当前作息呈现。
 * 纯函数便于单测；与后端 TimeSlot / slot-clock 默认对齐。
 */

/** 全量时序（排名用，含扩展档） */
export const FULL_SLOT_ORDER = [
  'after_wake',
  'after_breakfast',
  'before_school',
  'after_lunch',
  'after_school',
  'after_dinner',
  'bedtime',
  'anytime',
] as const

/** 基础档（默认可见） */
export const BASE_SLOT_ORDER = [
  'after_wake',
  'after_school',
  'after_dinner',
  'bedtime',
  'anytime',
] as const

/** 扩展档（家庭开关） */
export const EXTENDED_SLOTS = [
  'before_school',
  'after_breakfast',
  'after_lunch',
] as const

/** @deprecated 兼容旧引用：等同基础档；UI 请用 slotOrderForUi */
export const SLOT_ORDER = BASE_SLOT_ORDER

export type TimeSlot = (typeof FULL_SLOT_ORDER)[number]
export type AgeBand = 'young' | 'general' | 'teen' | string

export type SlotHourRange = { startHour: number; endHour: number }
export type SlotClockMap = Partial<Record<string, SlotHourRange>>

export const DEFAULT_CLOCK_BASE: Record<string, SlotHourRange> = {
  after_wake: { startHour: 6, endHour: 9 },
  after_school: { startHour: 14, endHour: 18 },
  after_dinner: { startHour: 18, endHour: 21 },
  bedtime: { startHour: 21, endHour: 6 },
}

export const DEFAULT_CLOCK_EXTENDED: Record<string, SlotHourRange> = {
  after_wake: { startHour: 6, endHour: 7 },
  after_breakfast: { startHour: 7, endHour: 8 },
  before_school: { startHour: 8, endHour: 9 },
  after_lunch: { startHour: 12, endHour: 14 },
  after_school: { startHour: 14, endHour: 18 },
  after_dinner: { startHour: 18, endHour: 21 },
  bedtime: { startHour: 21, endHour: 6 },
}

const SLOT_LABELS: Record<string, string> = {
  after_wake: '起床后',
  after_breakfast: '早餐后',
  before_school: '上学前',
  after_lunch: '午餐后',
  after_school: '放学后',
  after_dinner: '晚饭后',
  bedtime: '睡前',
  anytime: '随时',
}

export function labelSlot(s: string): string {
  return SLOT_LABELS[s] || '随时'
}

export function slotOrderForUi(extendedEnabled: boolean): TimeSlot[] {
  if (!extendedEnabled) return [...BASE_SLOT_ORDER]
  return [...FULL_SLOT_ORDER]
}

export function slotRank(s: string): number {
  const i = FULL_SLOT_ORDER.indexOf(s as TimeSlot)
  return i < 0 ? 99 : i
}

export function hourInRange(
  hour: number,
  range: SlotHourRange,
): boolean {
  const { startHour: start, endHour: end } = range
  if (start === end) return false
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

export function effectiveClockMap(
  extendedEnabled: boolean,
  override?: SlotClockMap | null,
): Record<string, SlotHourRange> {
  const base = {
    ...(extendedEnabled ? DEFAULT_CLOCK_EXTENDED : DEFAULT_CLOCK_BASE),
  }
  if (!override) return base
  for (const [k, v] of Object.entries(override)) {
    if (!v) continue
    if (
      !extendedEnabled &&
      (EXTENDED_SLOTS as readonly string[]).includes(k)
    ) {
      continue
    }
    if (
      typeof v.startHour === 'number' &&
      typeof v.endHour === 'number' &&
      v.startHour !== v.endHour
    ) {
      base[k] = { startHour: v.startHour, endHour: v.endHour }
    }
  }
  return base
}

/**
 * 按本地钟点推断当前作息窗；可传入家庭有效映射。
 * 匹配顺序：全量时序中除 anytime 外的有映射时段；未命中 → anytime。
 */
export function resolveCurrentSlot(
  date: Date = new Date(),
  opts?: {
    extendedEnabled?: boolean
    clockMap?: SlotClockMap | null
  },
): TimeSlot {
  const map = effectiveClockMap(
    !!opts?.extendedEnabled,
    opts?.clockMap,
  )
  const h = date.getHours()
  for (const slot of FULL_SLOT_ORDER) {
    if (slot === 'anytime') continue
    const range = map[slot]
    if (!range) continue
    if (hourInRange(h, range)) return slot
  }
  return 'anytime'
}

export function maxVisibleInCurrentSlot(ageBand: AgeBand): number {
  if (ageBand === 'young') return 3
  if (ageBand === 'teen') return 8
  return 5
}

export function maxAnytimeVisible(ageBand: AgeBand): number {
  if (ageBand === 'young') return 1
  return 2
}

/** 低龄默认不可展开其它时段目录 */
export function allowPeekOtherSlots(ageBand: AgeBand): boolean {
  return ageBand !== 'young'
}

export type SlotTodo = {
  key: string
  timeSlot: string
}

export type SlotWindowResult<T extends SlotTodo> = {
  focusSlot: TimeSlot
  /** 当前窗列表（含过窗 1 条、anytime 弱化条），已截断 */
  items: Array<T & { windowKind: 'carry' | 'current' | 'anytime' }>
  /** 当前窗被截断未展示的件数 */
  truncatedCount: number
  /** 其它时段汇总（不含已作为 carry 露出的那一条） */
  laterGroups: Array<{
    slot: TimeSlot
    label: string
    count: number
    /** 相对焦点窗：更早 / 更晚 / 随时 */
    relation: 'earlier' | 'later' | 'anytime'
  }>
  laterTotal: number
  /** 其它时段中性摘要（区分之前未收尾 / 稍后再做） */
  otherSlotsSummary: string
}

export function normalizeTimeSlot(s: string | null | undefined): TimeSlot {
  if (s && (FULL_SLOT_ORDER as readonly string[]).includes(s)) return s as TimeSlot
  return 'anytime'
}

/**
 * 默认焦点窗：钟点对应时段仍有待办 → 跟钟点；
 * 否则跟「下一件」所在时段，避免标题与 hero 打架。
 */
export function resolveDefaultFocusSlot(opts: {
  clockSlot: TimeSlot
  nextItemSlot?: string | null
  pending: SlotTodo[]
}): TimeSlot {
  const clockHasWork = opts.pending.some(
    (i) => (i.timeSlot || 'anytime') === opts.clockSlot,
  )
  if (clockHasWork) return opts.clockSlot
  if (opts.nextItemSlot) return normalizeTimeSlot(opts.nextItemSlot)
  return opts.clockSlot
}

/** 其它时段文案：不把过窗剩余说成「到点再看」 */
export function formatOtherSlotsSummary(
  groups: Array<{ slot: string; count: number; relation?: string }>,
  focusSlot: TimeSlot,
): string {
  const focusRank = slotRank(focusSlot)
  let earlier = 0
  let later = 0
  let anytime = 0
  for (const g of groups) {
    const rel =
      g.relation ||
      (g.slot === 'anytime'
        ? 'anytime'
        : slotRank(g.slot) < focusRank
          ? 'earlier'
          : 'later')
    if (rel === 'earlier') earlier += g.count
    else if (rel === 'anytime') anytime += g.count
    else later += g.count
  }
  const parts: string[] = []
  if (earlier) parts.push(`之前未收尾 ${earlier} 件`)
  if (later) parts.push(`稍后再做 ${later} 件`)
  if (anytime) parts.push(`有空再做 ${anytime} 件`)
  if (!parts.length) return ''
  return `还有其它时段：${parts.join(' · ')}`
}

/**
 * 拼装今日「这一段」列表。
 * - nextKey：已在 hero「下一件」展示的项，不重复出现
 * - focusSlot：当前窗（时钟对齐 / 手动）
 */
export function buildSlotWindow<T extends SlotTodo>(opts: {
  pending: T[]
  nextKey?: string | null
  focusSlot: TimeSlot
  ageBand?: AgeBand
  /** 折叠其它时段时用的可见序；默认全量 */
  slotOrder?: readonly string[]
}): SlotWindowResult<T> {
  const ageBand = opts.ageBand || 'general'
  const rest = opts.pending.filter((i) => i.key !== opts.nextKey)
  const focus = opts.focusSlot
  const focusRank = slotRank(focus)
  const order = opts.slotOrder?.length
    ? opts.slotOrder
    : FULL_SLOT_ORDER

  const bySlot = (slot: string) =>
    rest
      .filter((i) => (i.timeSlot || 'anytime') === slot)
      .sort((a, b) => a.key.localeCompare(b.key))

  // 过窗：严格早于当前窗的非 anytime 任务，最多 1 条
  let carry: T | null = null
  if (focus !== 'anytime') {
    const earlier = rest
      .filter((i) => {
        const s = i.timeSlot || 'anytime'
        if (s === 'anytime') return false
        return slotRank(s) < focusRank
      })
      .sort(
        (a, b) =>
          slotRank(a.timeSlot) - slotRank(b.timeSlot) ||
          a.key.localeCompare(b.key),
      )
    carry = earlier[0] || null
  }

  const currentRaw = bySlot(focus)
  const anytimeCap = maxAnytimeVisible(ageBand)
  const anytimeRaw =
    focus === 'anytime' ? [] : bySlot('anytime').slice(0, anytimeCap)

  type Row = T & { windowKind: 'carry' | 'current' | 'anytime' }
  const assembled: Row[] = []
  if (carry) {
    assembled.push({ ...carry, windowKind: 'carry' })
  }
  for (const i of currentRaw) {
    if (carry && i.key === carry.key) continue
    assembled.push({ ...i, windowKind: 'current' })
  }
  for (const i of anytimeRaw) {
    assembled.push({ ...i, windowKind: 'anytime' })
  }

  const cap = maxVisibleInCurrentSlot(ageBand)
  const items = assembled.slice(0, cap)
  const truncatedCount = Math.max(0, assembled.length - items.length)

  const shownKeys = new Set(items.map((i) => i.key))
  if (opts.nextKey) shownKeys.add(opts.nextKey)

  const laterGroups: SlotWindowResult<T>['laterGroups'] = []
  for (const slot of order) {
    if (slot === focus) continue
    const count = rest.filter((i) => {
      if (shownKeys.has(i.key)) return false
      return (i.timeSlot || 'anytime') === slot
    }).length
    if (count > 0) {
      const relation: 'earlier' | 'later' | 'anytime' =
        slot === 'anytime'
          ? 'anytime'
          : slotRank(slot) < focusRank
            ? 'earlier'
            : 'later'
      laterGroups.push({
        slot: slot as TimeSlot,
        label: labelSlot(slot),
        count,
        relation,
      })
    }
  }

  // 扩展关掉时，仍汇总「不在可见序里」但清单中有的扩展时段
  if (opts.slotOrder?.length) {
    const visible = new Set(opts.slotOrder)
    for (const slot of FULL_SLOT_ORDER) {
      if (visible.has(slot) || slot === focus) continue
      if (laterGroups.some((g) => g.slot === slot)) continue
      const count = rest.filter((i) => {
        if (shownKeys.has(i.key)) return false
        return (i.timeSlot || 'anytime') === slot
      }).length
      if (count > 0) {
        laterGroups.push({
          slot,
          label: labelSlot(slot),
          count,
          relation:
            slot === 'anytime'
              ? 'anytime'
              : slotRank(slot) < focusRank
                ? 'earlier'
                : 'later',
        })
      }
    }
    laterGroups.sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
  }

  const laterTotal = laterGroups.reduce((n, g) => n + g.count, 0)
  const otherSlotsSummary = formatOtherSlotsSummary(laterGroups, focus)

  return {
    focusSlot: focus,
    items,
    truncatedCount,
    laterGroups,
    laterTotal,
    otherSlotsSummary,
  }
}

/** 家长侧：每日任务是否挤在同一时段 / 总量偏多 */
export function analyzeDailySlotDensity(
  tasks: Array<{
    schedule?: string
    timeSlot?: string
    assigns?: Array<{ studentId?: number; student?: { id?: number; name?: string } }>
  }>,
): { level: 'ok' | 'warn'; message: string } {
  type Agg = { total: number; bySlot: Record<string, number>; name: string }
  const byStudent = new Map<number, Agg>()

  for (const t of tasks) {
    if (t.schedule !== 'daily') continue
    const slot = t.timeSlot || 'anytime'
    for (const a of t.assigns || []) {
      const id = a.studentId ?? a.student?.id
      if (!id) continue
      let row = byStudent.get(id)
      if (!row) {
        row = {
          total: 0,
          bySlot: {},
          name: a.student?.name || `学生${id}`,
        }
        byStudent.set(id, row)
      }
      row.total += 1
      row.bySlot[slot] = (row.bySlot[slot] || 0) + 1
    }
  }

  const tips: string[] = []
  for (const row of byStudent.values()) {
    if (row.total >= 8) {
      tips.push(
        `${row.name} 每天约有 ${row.total} 件任务，容易一眼看不完；建议减少或分散到不同时段`,
      )
      continue
    }
    for (const [slot, n] of Object.entries(row.bySlot)) {
      if (n >= 5) {
        tips.push(
          `${row.name} 在「${labelSlot(slot)}」有 ${n} 件每日任务，建议把部分改到起床后/放学后/晚饭后/睡前`,
        )
      }
    }
  }

  if (!tips.length) return { level: 'ok', message: '' }
  return { level: 'warn', message: tips[0] }
}
