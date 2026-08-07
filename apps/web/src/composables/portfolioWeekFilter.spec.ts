import { describe, expect, it } from 'vitest'
import {
  buildThemeFilterOptions,
  itemsInWeekKey,
} from './portfolioWeekFilter'

describe('portfolioWeekFilter', () => {
  it('buildThemeFilterOptions：本周优先，历史去重，最多 6', () => {
    const opts = buildThemeFilterOptions(
      { weekKey: '2026-W28', themeTitle: '小整理周主题标题超长' },
      [
        { weekKey: '2026-W28', themeTitle: '重复本周' },
        { weekKey: '2026-W27', themeTitle: '上周感恩' },
        { weekKey: '2026-W26', text: '只有小目标' },
      ],
    )
    expect(opts[0]).toEqual({ weekKey: '2026-W28', label: '本周·小整理周主题标题' })
    expect(opts.map((o) => o.weekKey)).toEqual([
      '2026-W28',
      '2026-W27',
      '2026-W26',
    ])
    expect(opts[2].label).toBe('只有小目标')
  })

  it('itemsInWeekKey：空 weekKey 不过滤；有 key 按周一～周日', () => {
    const items = [
      { id: 1, date: '2026-07-06' }, // Mon W28
      { id: 2, date: '2026-07-12' }, // Sun W28
      { id: 3, date: '2026-07-13' }, // next Mon
    ]
    expect(itemsInWeekKey(items, '', (i) => i.date)).toHaveLength(3)
    const inWeek = itemsInWeekKey(items, '2026-W28', (i) => i.date)
    expect(inWeek.map((i) => i.id)).toEqual([1, 2])
  })
})
