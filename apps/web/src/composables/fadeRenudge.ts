/** 积分淡出「本次知道了」后的二次软提醒（仅前端，不写库） */

const KEY_AT = 'xueji_fade_dismiss_at'
const KEY_MODE = 'xueji_fade_dismiss_suggest'
const RENUDGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000

export function rememberFadeDismiss(suggestMode?: string) {
  localStorage.setItem(KEY_AT, String(Date.now()))
  if (suggestMode) localStorage.setItem(KEY_MODE, suggestMode)
}

export function clearFadeDismiss() {
  localStorage.removeItem(KEY_AT)
  localStorage.removeItem(KEY_MODE)
}

export function fadeDismissAgeMs(now = Date.now()): number | null {
  const raw = localStorage.getItem(KEY_AT)
  if (!raw) return null
  const at = Number(raw)
  if (!Number.isFinite(at) || at <= 0) return null
  return Math.max(0, now - at)
}

/** 已 dismiss 且满 7 天 → 可二次提醒 */
export function shouldRenudgeFade(now = Date.now()): boolean {
  const age = fadeDismissAgeMs(now)
  if (age == null) return false
  return age >= RENUDGE_AFTER_MS
}

export function fadeRenudgeMessage(base: string): string {
  const tip = (base || '').trim()
  const prefix = '上次提过加分节奏，还没改也完全没关系。若愿意，仍可以轻轻试一下：'
  return tip ? `${prefix}${tip}` : `${prefix}完成先庆祝，积分偶尔出现或周末再结算。`
}

export const FADE_RENUDGE_AFTER_MS = RENUDGE_AFTER_MS
