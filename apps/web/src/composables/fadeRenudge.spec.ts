import { afterEach, describe, expect, it } from 'vitest'
import {
  FADE_RENUDGE_AFTER_MS,
  clearFadeDismiss,
  fadeDismissAgeMs,
  fadeRenudgeMessage,
  rememberFadeDismiss,
  shouldRenudgeFade,
} from './fadeRenudge'

describe('fadeRenudge', () => {
  afterEach(() => {
    clearFadeDismiss()
  })

  it('未 dismiss 时不可二次提醒', () => {
    expect(fadeDismissAgeMs()).toBeNull()
    expect(shouldRenudgeFade()).toBe(false)
  })

  it('刚 dismiss 未满 7 天不可再提醒', () => {
    rememberFadeDismiss('sometimes')
    expect(shouldRenudgeFade()).toBe(false)
    expect(fadeDismissAgeMs()!).toBeLessThan(1000)
  })

  it('满 7 天可二次提醒', () => {
    const eightDaysAgo = Date.now() - FADE_RENUDGE_AFTER_MS - 60_000
    localStorage.setItem('xueji_fade_dismiss_at', String(eightDaysAgo))
    expect(shouldRenudgeFade()).toBe(true)
  })

  it('二次文案带软前缀', () => {
    const msg = fadeRenudgeMessage('试试有时加分')
    expect(msg).toContain('上次提过')
    expect(msg).toContain('试试有时加分')
    expect(fadeRenudgeMessage('')).toContain('完成先庆祝')
  })

  it('clear 后回到未 dismiss', () => {
    rememberFadeDismiss()
    clearFadeDismiss()
    expect(fadeDismissAgeMs()).toBeNull()
    expect(shouldRenudgeFade()).toBe(false)
  })
})
