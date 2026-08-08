import { describe, expect, it } from 'vitest'
import {
  getAgeContentPack,
  moodOptionsForBand,
  normalizeAgeBand,
  weekendPanelIndex,
  weekendStepCount,
  weekendSecondsForDisplayStep,
} from './ageContentPack'
import { maxVisibleInCurrentSlot } from './timeSlotPolicy'

describe('ageContentPack', () => {
  it('normalize 回落 general', () => {
    expect(normalizeAgeBand(undefined)).toBe('general')
    expect(normalizeAgeBand('')).toBe('general')
    expect(normalizeAgeBand('young')).toBe('young')
  })

  it('今日可见条数与 timeSlotPolicy 对齐', () => {
    for (const b of ['young', 'general', 'teen'] as const) {
      expect(getAgeContentPack(b).todayDefaultVisible).toBe(
        maxVisibleInCurrentSlot(b),
      )
    }
  })

  it('young 小会 2 步且映射骄傲+承诺', () => {
    expect(weekendStepCount('young')).toBe(2)
    expect(weekendPanelIndex('young', 0)).toBe(0)
    expect(weekendPanelIndex('young', 1)).toBe(2)
    expect(
      getAgeContentPack('young').weekendStepSeconds.reduce((a, b) => a + b, 0),
    ).toBeLessThanOrEqual(10 * 60)
  })

  it('general 三步为回归基线', () => {
    expect(weekendStepCount('general')).toBe(3)
    expect(weekendPanelIndex('general', 1)).toBe(1)
    expect(getAgeContentPack('general').nonBuyWishHint).toContain('陪伴')
  })

  it('teen 突出自主与弱余额', () => {
    const p = getAgeContentPack('teen')
    expect(p.proposeStripProminent).toBe(true)
    expect(p.reorderProminent).toBe(true)
    expect(p.balanceDeemphasized).toBe(true)
    expect(p.tokenNarrative).toBe('quiet')
  })

  it('young 心情词表为子集', () => {
    const tags = moodOptionsForBand('young').map((m) => m.tag)
    expect(tags).toEqual(['happy', 'ok', 'tired'])
    expect(moodOptionsForBand('general')).toHaveLength(4)
  })

  it('计时按展示步', () => {
    expect(weekendSecondsForDisplayStep('young', 0)).toBe(180)
    expect(weekendSecondsForDisplayStep('young', 1)).toBe(120)
  })
})
