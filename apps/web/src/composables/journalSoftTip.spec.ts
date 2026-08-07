import { describe, expect, it, beforeEach } from 'vitest'
import {
  dismissJournalSoftTip,
  isJournalSoftTipDismissed,
  journalSoftTipCopy,
  journalTipWeekKey,
} from './journalSoftTip'

describe('journalSoftTip', () => {
  beforeEach(() => {
    localStorage.removeItem(`xueji_journal_soft_tip_dismiss_${journalTipWeekKey()}`)
  })

  it('无帖不展示', () => {
    expect(journalSoftTipCopy(0)).toBeNull()
  })

  it('幼龄文案用给家人看', () => {
    const c = journalSoftTipCopy(2, 'young')
    expect(c?.title).toContain('给家人看')
    expect(c?.message).toContain('不计分')
  })

  it('dismiss 可记住本周', () => {
    const w = journalTipWeekKey()
    expect(isJournalSoftTipDismissed(w)).toBe(false)
    dismissJournalSoftTip(w)
    expect(isJournalSoftTipDismissed(w)).toBe(true)
  })
})
