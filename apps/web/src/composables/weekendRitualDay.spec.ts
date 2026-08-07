import { describe, expect, it } from 'vitest'
import { isWeekendRitualDay } from './weekendRitualDay'

describe('isWeekendRitualDay', () => {
  it('周五六日为 true', () => {
    expect(isWeekendRitualDay(new Date('2026-08-07T12:00:00'))).toBe(true) // 五
    expect(isWeekendRitualDay(new Date('2026-08-08T12:00:00'))).toBe(true) // 六
    expect(isWeekendRitualDay(new Date('2026-08-09T12:00:00'))).toBe(true) // 日
  })

  it('周一至周四为 false', () => {
    expect(isWeekendRitualDay(new Date('2026-08-03T12:00:00'))).toBe(false) // 一
    expect(isWeekendRitualDay(new Date('2026-08-06T12:00:00'))).toBe(false) // 四
  })
})
