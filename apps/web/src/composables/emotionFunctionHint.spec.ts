import { describe, expect, it } from 'vitest'
import {
  assertsNoScoreLanguage,
  calendarSoftStrategy,
  chipsForEmotionFunction,
  classifyEmotionFunction,
  dismissCalendarSoft,
  isCalendarSoftDismissed,
} from './emotionFunctionHint'

describe('emotionFunctionHint', () => {
  it('过载/累 → 耗竭', () => {
    const h = classifyEmotionFunction({ parentOverload: true })
    expect(h?.kind).toBe('exhaustion')
    expect(h?.parentNote).toContain('可能')
    expect(assertsNoScoreLanguage(h!.parentNote)).toBe(true)
  })

  it('难 ≥2 → 能力威胁', () => {
    expect(classifyEmotionFunction({ moodHard: 2 })?.kind).toBe(
      'competence_threat',
    )
  })

  it('公平洞察 → 关系威胁', () => {
    expect(classifyEmotionFunction({ fairnessHint: true })?.kind).toBe(
      'relation_threat',
    )
  })

  it('高缓做无累难 → 意义缺失', () => {
    expect(
      classifyEmotionFunction({ deferCount: 3, moodTired: 0, moodHard: 0 })
        ?.kind,
    ).toBe('meaning_gap')
  })

  it('无信号返回 null', () => {
    expect(classifyEmotionFunction({})).toBeNull()
  })

  it('可从本周模式文案启发式', () => {
    const h = classifyEmotionFunction({
      weekPatternText: '这周缓做用得比较多；打卡前「累/难」出现得较多',
    })
    expect(h?.kind).toBe('exhaustion')
  })

  it('芯片每类 ≤3 且无绩效夸', () => {
    for (const k of [
      'exhaustion',
      'competence_threat',
      'relation_threat',
      'meaning_gap',
    ] as const) {
      const chips = chipsForEmotionFunction(k)
      expect(chips.length).toBeLessThanOrEqual(3)
      expect(chips.length).toBeGreaterThan(0)
      const blob = chips.join('')
      expect(blob).not.toMatch(/真棒|又完成了|加油拿分/)
    }
  })

  it('周末 / 考试季弱策略可 dismiss', () => {
    const sat = new Date('2026-08-08T12:00:00') // Saturday
    const soft = calendarSoftStrategy(sat)
    expect(soft?.kind).toBe('weekend')
    dismissCalendarSoft('weekend', sat)
    expect(isCalendarSoftDismissed('weekend', sat)).toBe(true)

    const examDay = new Date('2026-06-10T12:00:00') // Wed in June
    expect(calendarSoftStrategy(examDay)?.kind).toBe('exam_season')
  })
})
