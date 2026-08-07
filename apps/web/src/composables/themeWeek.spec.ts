import { describe, expect, it } from 'vitest'
import {
  dateInWeekRange,
  rangeForIsoWeekKey,
  suggestionsForThemePreset,
} from './themeWeek'

describe('themeWeek helpers', () => {
  it('suggestionsForThemePreset returns chips for known presets', () => {
    expect(suggestionsForThemePreset('tidy').length).toBeGreaterThan(0)
    expect(suggestionsForThemePreset('custom')).toEqual([])
    expect(suggestionsForThemePreset('')).toEqual([])
  })

  it('rangeForIsoWeekKey returns Mon–Sun for a known week', () => {
    // 2026-W28: Mon 2026-07-06 … Sun 2026-07-12
    const r = rangeForIsoWeekKey('2026-W28')
    expect(r).toEqual({ from: '2026-07-06', to: '2026-07-12' })
    expect(rangeForIsoWeekKey('bad')).toBeNull()
  })

  it('dateInWeekRange filters inclusive', () => {
    const r = { from: '2026-07-06', to: '2026-07-12' }
    expect(dateInWeekRange('2026-07-06', r)).toBe(true)
    expect(dateInWeekRange('2026-07-12T12:00:00', r)).toBe(true)
    expect(dateInWeekRange('2026-07-05', r)).toBe(false)
    expect(dateInWeekRange('2026-07-13', r)).toBe(false)
    expect(dateInWeekRange('2026-07-13', null)).toBe(true)
  })
})
