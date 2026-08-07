/**
 * 周末小会「本周模式」一句 — 纯函数，前后端可共用思路
 */
export function buildWeekendPatternHint(opts: {
  deferCount: number
  moodTiredOrHard: number
  reflectionCount: number
  journalWeekCount: number
}): string | null {
  const parts: string[] = []
  if (opts.deferCount >= 3) {
    parts.push('这周缓做用得比较多，节奏可能偏紧')
  }
  if (opts.moodTiredOrHard >= 2) {
    parts.push('打卡前「累/难」出现得较多')
  }
  if (opts.reflectionCount >= 2) {
    parts.push('有留下反思，值得一起听听')
  }
  if (opts.journalWeekCount >= 1) {
    parts.push(`家庭说说本周有 ${opts.journalWeekCount} 条`)
  }
  if (!parts.length) return null
  return parts.slice(0, 2).join('；') + '。小会里可以只挑一件聊聊。'
}

/** 分步建议时长（秒） */
export const WEEKEND_STEP_SECONDS = [3 * 60, 3 * 60, 2 * 60] as const

export function formatRitualCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
