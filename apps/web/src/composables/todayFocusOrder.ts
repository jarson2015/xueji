/**

 * 今日「先做这件」有限重排 — 服务端持久化，localStorage 作回落与迁库。

 */

import http from '../api/http'



export function todayOrderStorageKey(studentId: number | string, day = localDayKey()) {

  return `todayFocusOrder:${day}:${studentId}`

}



export function localDayKey(d = new Date()) {

  const y = d.getFullYear()

  const m = String(d.getMonth() + 1).padStart(2, '0')

  const day = String(d.getDate()).padStart(2, '0')

  return `${y}-${m}-${day}`

}



export type TodayOrderState = {

  keys: string[]

  swaps: number

}



const emptyOrder = (): TodayOrderState => ({ keys: [], swaps: 0 })



function loadTodayOrderLocal(studentId: number | string): TodayOrderState {

  try {

    const raw = localStorage.getItem(todayOrderStorageKey(studentId))

    if (!raw) return emptyOrder()

    const parsed = JSON.parse(raw)

    return {

      keys: Array.isArray(parsed.keys) ? parsed.keys.map(String) : [],

      swaps: Math.max(0, Number(parsed.swaps) || 0),

    }

  } catch {

    return emptyOrder()

  }

}



function saveTodayOrderLocal(studentId: number | string, state: TodayOrderState) {

  localStorage.setItem(todayOrderStorageKey(studentId), JSON.stringify(state))

}



/** @deprecated use syncTodayOrderFromServer */

export function loadTodayOrder(studentId: number | string): TodayOrderState {

  return loadTodayOrderLocal(studentId)

}



/** @deprecated use persistTodayOrder */

export function saveTodayOrder(studentId: number | string, state: TodayOrderState) {

  saveTodayOrderLocal(studentId, state)

}



export async function syncTodayOrderFromServer(

  studentId: number | string,

): Promise<TodayOrderState> {

  const local = loadTodayOrderLocal(studentId)

  try {

    const res = (await http.get('/my/daily-focus')) as {

      keys?: string[]

      swaps?: number

    }

    const remote: TodayOrderState = {

      keys: Array.isArray(res.keys) ? res.keys.map(String) : [],

      swaps: Math.max(0, Number(res.swaps) || 0),

    }

    const hasLocal = local.keys.length > 0 || local.swaps > 0

    const hasRemote = remote.keys.length > 0 || remote.swaps > 0

    if (hasLocal && !hasRemote) {

      await http.put('/my/daily-focus', { keys: local.keys, swaps: local.swaps })

      return local

    }

    if (hasRemote) saveTodayOrderLocal(studentId, remote)

    return hasRemote ? remote : local

  } catch {

    return local

  }

}



export async function persistTodayOrder(

  studentId: number | string,

  state: TodayOrderState,

): Promise<TodayOrderState> {

  const safe: TodayOrderState = {

    keys: state.keys.map(String),

    swaps: Math.max(0, state.swaps || 0),

  }

  saveTodayOrderLocal(studentId, safe)

  try {

    const res = (await http.put('/my/daily-focus', {

      keys: safe.keys,

      swaps: safe.swaps,

    })) as { keys?: string[]; swaps?: number }

    return {

      keys: Array.isArray(res.keys) ? res.keys.map(String) : safe.keys,

      swaps: Math.max(0, Number(res.swaps) || safe.swaps),

    }

  } catch {

    return safe

  }

}



export function maxTodaySwaps(ageBand: string) {

  return ageBand === 'teen' ? 3 : 2

}



export function applyFocusOrder<T extends { key: string }>(

  items: T[],

  preferredKeys: string[],

): T[] {

  if (!preferredKeys.length || !items.length) return items

  const rank = new Map(preferredKeys.map((k, i) => [k, i]))

  return [...items].sort((a, b) => {

    const ra = rank.has(a.key) ? rank.get(a.key)! : 1000

    const rb = rank.has(b.key) ? rank.get(b.key)! : 1000

    return ra - rb

  })

}



export function reflectionChipsForAge(ageBand: string): string[] {

  if (ageBand === 'young') {

    return ['今天状态不错', '有点难但挺住了', '做完好开心']

  }

  if (ageBand === 'teen') {

    return ['今天状态不错', '有点难但挺住了', '下次想提前开始']

  }

  return ['今天状态不错', '有点难但挺住了', '下次想提前开始']

}

export function focusReflectionChipsForAge(ageBand: string): string[] {
  if (ageBand === 'young') {
    return ['专注住了', '有点走神但做完了', '中间休息了一下']
  }
  if (ageBand === 'teen') {
    return ['全程在线', '中途分心但拉回', '还想再来一轮']
  }
  return ['专注不错', '有点走神', '分段完成']
}

export function habitRhythmLabel(t: {
  habitStreak?: number
  habitRhythm?: {
    doneDays: number
    windowDays: number
    targetDays: number
    onTrack?: boolean
  }
}): string | null {
  const r = t.habitRhythm
  if (r && r.doneDays >= 2) {
    if (r.onTrack || r.doneDays >= r.targetDays) {
      return `这阵子节奏不错（7 天 ${r.doneDays} 次）`
    }
    return `最近 7 天完成了 ${r.doneDays} 次`
  }
  if ((t.habitStreak || 0) > 0) {
    return (t.habitStreak || 0) >= 7
      ? '这阵子节奏不错'
      : `最近 ${t.habitStreak} 天有完成`
  }
  return null
}

