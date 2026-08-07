/**
 * 本周小目标 + 主题周——服务端持久化，localStorage 作离线回落。
 */
import http from '../api/http'
import type { WeeklyGoalState } from './themeWeek'

function weekKey(d = new Date()) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function weeklyGoalStorageKey(
  studentId: number | string,
  week = weekKey(),
) {
  return `teenWeeklyGoal:${week}:${studentId}`
}

function loadWeeklyGoalLocal(studentId: number | string): string {
  try {
    return localStorage.getItem(weeklyGoalStorageKey(studentId)) || ''
  } catch {
    return ''
  }
}

function saveWeeklyGoalLocal(studentId: number | string, text: string) {
  const t = text.trim().slice(0, 80)
  const key = weeklyGoalStorageKey(studentId)
  if (!t) localStorage.removeItem(key)
  else localStorage.setItem(key, t)
  return t
}

/** @deprecated use syncWeeklyGoalFromServer */
export function loadWeeklyGoal(studentId: number | string): string {
  return loadWeeklyGoalLocal(studentId)
}

/** @deprecated use persistWeeklyGoal */
export function saveWeeklyGoal(studentId: number | string, text: string) {
  return saveWeeklyGoalLocal(studentId, text)
}

function emptyState(week = weekKey()): WeeklyGoalState {
  return { weekKey: week, text: '', themePreset: '', themeTitle: '' }
}

export async function syncWeeklyGoalStateFromServer(
  studentId: number | string,
): Promise<WeeklyGoalState> {
  const local = loadWeeklyGoalLocal(studentId)
  try {
    const res = (await http.get('/my/weekly-goal')) as WeeklyGoalState
    const remote = (res.text || '').trim()
    if (!remote && local && !(res.themePreset || res.themeTitle)) {
      const saved = (await http.put('/my/weekly-goal', {
        text: local,
      })) as WeeklyGoalState
      const out = {
        weekKey: saved.weekKey || weekKey(),
        text: (saved.text || local).trim(),
        themePreset: saved.themePreset || '',
        themeTitle: saved.themeTitle || '',
      }
      if (out.text) localStorage.setItem(weeklyGoalStorageKey(studentId), out.text)
      return out
    }
    if (remote) localStorage.setItem(weeklyGoalStorageKey(studentId), remote)
    return {
      weekKey: res.weekKey || weekKey(),
      text: remote,
      themePreset: res.themePreset || '',
      themeTitle: res.themeTitle || '',
    }
  } catch {
    return { ...emptyState(), text: local }
  }
}

/** 兼容旧调用：只返回 text */
export async function syncWeeklyGoalFromServer(
  studentId: number | string,
): Promise<string> {
  const s = await syncWeeklyGoalStateFromServer(studentId)
  return s.text
}

export async function persistWeeklyGoalState(
  studentId: number | string,
  body: {
    text?: string
    themePreset?: string
    themeTitle?: string
  },
): Promise<WeeklyGoalState> {
  try {
    const res = (await http.put('/my/weekly-goal', body)) as WeeklyGoalState
    const out = {
      weekKey: res.weekKey || weekKey(),
      text: (res.text ?? body.text ?? '').trim().slice(0, 80),
      themePreset: res.themePreset || '',
      themeTitle: res.themeTitle || '',
    }
    saveWeeklyGoalLocal(studentId, out.text)
    return out
  } catch {
    return {
      ...emptyState(),
      text: saveWeeklyGoalLocal(studentId, body.text || ''),
      themePreset: body.themePreset || '',
      themeTitle: (body.themeTitle || '').slice(0, 40),
    }
  }
}

export async function persistWeeklyGoal(
  studentId: number | string,
  text: string,
): Promise<string> {
  const s = await persistWeeklyGoalState(studentId, { text })
  return s.text
}

export { weekKey }
