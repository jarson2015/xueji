import { describe, expect, it } from 'vitest'
import { friendlyError } from './useOnboarding'

describe('friendlyError 限流', () => {
  it('识别「太频繁」秒数', () => {
    expect(friendlyError(new Error('操作太频繁，请 30 秒后再试'), '失败')).toBe(
      '操作有点勤，请 30 秒后再试',
    )
  })

  it('识别 429', () => {
    expect(friendlyError(new Error('429 Too Many Requests'), '失败')).toBe(
      '操作有点勤，请稍后再试',
    )
  })
})
