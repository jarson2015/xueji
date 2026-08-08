import { describe, expect, it } from 'vitest'
import {
  RELATION_SELF_CHECK_QUESTIONS,
  SELF_CHECK_DISCLAIMER,
  SELF_CHECK_DONE_NOTE,
  assertsNoScoringCopy,
  currentMonthKey,
  readSelfCheck,
  saveSelfCheckAnswers,
  skipSelfCheckThisMonth,
} from './relationSelfCheck'

describe('relationSelfCheck', () => {
  it('题目数量合适且无打分话术', () => {
    expect(RELATION_SELF_CHECK_QUESTIONS.length).toBeGreaterThanOrEqual(3)
    expect(RELATION_SELF_CHECK_QUESTIONS.length).toBeLessThanOrEqual(5)
    expect(assertsNoScoringCopy(SELF_CHECK_DISCLAIMER)).toBe(true)
    expect(assertsNoScoringCopy(SELF_CHECK_DONE_NOTE)).toBe(true)
    expect(SELF_CHECK_DISCLAIMER).toContain('可随时跳过')
  })

  it('可跳过与保存仅写本地', () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
    }
    const month = currentMonthKey()
    skipSelfCheckThisMonth(month, storage)
    expect(readSelfCheck(month, storage)?.skipped).toBe(true)

    saveSelfCheckAnswers({ chat: 'yes', order: 'partial' }, month, storage)
    const rec = readSelfCheck(month, storage)!
    expect(rec.skipped).toBe(false)
    expect(rec.answers.chat).toBe('yes')
    expect(rec.answers.order).toBe('partial')
  })
})
