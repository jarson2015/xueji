import { describe, expect, it } from 'vitest'
import {
  FADE_PACT_STAGES_NOTE,
  FADE_PACT_STUDENT_LINE,
  INTEREST_SUGGESTED_POINTS,
  INTEREST_ZERO_HINT,
  NOT_SCORE_DISCLAIMER,
  RELIEF_HELP_MESSAGE,
  assertsNotScoreDisclaimer,
  clearFadePactBannerDismiss,
  dismissFadePactBanner,
  isFadedRewardMode,
  shouldShowFadePactBanner,
} from './eduRelationCopy'

describe('eduRelationCopy', () => {
  it('用途声明含「用来聊聊」「不是评分」', () => {
    expect(assertsNotScoreDisclaimer(NOT_SCORE_DISCLAIMER)).toBe(true)
    expect(NOT_SCORE_DISCLAIMER).toContain('用来聊聊')
    expect(NOT_SCORE_DISCLAIMER).toContain('不是评分')
  })

  it('淡出模式与学生条', () => {
    expect(isFadedRewardMode('always')).toBe(false)
    expect(isFadedRewardMode('random')).toBe(true)
    expect(isFadedRewardMode('weekly_digest')).toBe(true)
    expect(FADE_PACT_STUDENT_LINE).toBe('我们家在练习少靠积分')
    expect(FADE_PACT_STAGES_NOTE).toContain('三阶段')
    expect(FADE_PACT_STAGES_NOTE).toContain('保存后才生效')
  })

  it('学生淡出条可 dismiss', () => {
    clearFadePactBannerDismiss()
    expect(shouldShowFadePactBanner('random')).toBe(true)
    dismissFadePactBanner()
    expect(shouldShowFadePactBanner('random')).toBe(false)
    expect(shouldShowFadePactBanner('always')).toBe(false)
    clearFadePactBannerDismiss()
  })

  it('兴趣建议 0 分；求助文案无诊断标签', () => {
    expect(INTEREST_SUGGESTED_POINTS).toBe(0)
    expect(INTEREST_ZERO_HINT).toContain('0 分')
    expect(RELIEF_HELP_MESSAGE).toContain('不能替代专业帮助')
    expect(RELIEF_HELP_MESSAGE).not.toMatch(/诊断|患病|抑郁症/)
  })
})
