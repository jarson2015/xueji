import { describe, expect, it } from 'vitest'
import {
  NEAR_TERM_TEMPLATES,
  NEAR_TERM_PRICE_CHIPS,
  nearTermTemplatesValid,
} from './nearWishTemplates'
import { NEAR_TERM_COST_MIN, NEAR_TERM_COST_MAX } from './nearWishPolicy'

describe('nearWishTemplates', () => {
  it('近端模板 ≥ 6 且分值在 5–20', () => {
    expect(NEAR_TERM_TEMPLATES.length).toBeGreaterThanOrEqual(6)
    expect(nearTermTemplatesValid()).toBe(true)
    for (const t of NEAR_TERM_TEMPLATES) {
      expect(t.costPoints).toBeGreaterThanOrEqual(NEAR_TERM_COST_MIN)
      expect(t.costPoints).toBeLessThanOrEqual(NEAR_TERM_COST_MAX)
    }
  })

  it('近端分值芯片覆盖 5–20', () => {
    expect(NEAR_TERM_PRICE_CHIPS).toEqual([5, 10, 15, 20])
  })
})
