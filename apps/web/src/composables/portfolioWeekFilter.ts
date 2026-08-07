import { dateInWeekRange, rangeForIsoWeekKey } from './themeWeek'

export type ThemeFilterOption = { weekKey: string; label: string }

export function buildThemeFilterOptions(
  weekTheme: { weekKey: string; themeTitle?: string } | null | undefined,
  themeHistory: Array<{
    weekKey: string
    themeTitle?: string
    text?: string
  }> = [],
  limit = 6,
): ThemeFilterOption[] {
  const opts: ThemeFilterOption[] = []
  if (weekTheme?.weekKey) {
    opts.push({
      weekKey: weekTheme.weekKey,
      label: `本周·${(weekTheme.themeTitle || '主题').slice(0, 8)}`,
    })
  }
  for (const h of themeHistory || []) {
    if (!h.weekKey || opts.some((o) => o.weekKey === h.weekKey)) continue
    opts.push({
      weekKey: h.weekKey,
      label: (h.themeTitle || h.text || h.weekKey).slice(0, 10),
    })
  }
  return opts.slice(0, limit)
}

export function itemsInWeekKey<T>(
  items: T[],
  weekKey: string,
  getDate: (item: T) => string,
): T[] {
  if (!weekKey) return items
  const range = rangeForIsoWeekKey(weekKey)
  return items.filter((item) => dateInWeekRange(getDate(item), range))
}
