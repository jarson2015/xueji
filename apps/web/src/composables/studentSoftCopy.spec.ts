import { describe, expect, it } from 'vitest'
import {
  buildRefreshCodeSoftCopy,
  buildResetPasswordSoftCopy,
} from './studentSoftCopy'

describe('studentSoftCopy', () => {
  it('刷新登录码说明旧码失效', () => {
    const c = buildRefreshCodeSoftCopy('小明')
    expect(c.title).toBe('刷新登录码')
    expect(c.message).toContain('小明')
    expect(c.message).toContain('立刻失效')
    expect(c.confirmText).toBe('刷新')
    expect(c.showInput).toBe(false)
  })

  it('重置密码要求输入且无默认弱密提示', () => {
    const c = buildResetPasswordSoftCopy('小红')
    expect(c.title).toContain('小红')
    expect(c.message).toContain('至少 6 位')
    expect(c.confirmText).toBe('重置')
    expect(c.showInput).toBe(true)
    expect(c.requireNote).toBe(true)
    expect(c.hint).toContain('简单')
  })
})
