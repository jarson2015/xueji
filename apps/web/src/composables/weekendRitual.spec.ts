import { describe, expect, it } from 'vitest'
import {
  WEEKEND_STEP_SECONDS,
  buildWeekendPatternHint,
  formatRitualCountdown,
} from './weekendRitual'

describe('weekendRitual', () => {
  it('无信号时不返回模式一句', () => {
    expect(
      buildWeekendPatternHint({
        deferCount: 0,
        moodTiredOrHard: 0,
        reflectionCount: 0,
        journalWeekCount: 0,
      }),
    ).toBeNull()
  })

  it('缓做偏多与说说可拼成一句（最多两段）', () => {
    const hint = buildWeekendPatternHint({
      deferCount: 3,
      moodTiredOrHard: 0,
      reflectionCount: 2,
      journalWeekCount: 2,
    })
    expect(hint).toContain('缓做')
    expect(hint).toContain('反思')
    expect(hint).not.toContain('家庭说说')
    expect(hint).toMatch(/小会里可以只挑一件聊聊/)
  })

  it('分步秒数 3′/3′/2′', () => {
    expect([...WEEKEND_STEP_SECONDS]).toEqual([180, 180, 120])
  })

  it('倒计时格式', () => {
    expect(formatRitualCountdown(180)).toBe('3:00')
    expect(formatRitualCountdown(65)).toBe('1:05')
    expect(formatRitualCountdown(0)).toBe('0:00')
    expect(formatRitualCountdown(-1)).toBe('0:00')
  })
})
