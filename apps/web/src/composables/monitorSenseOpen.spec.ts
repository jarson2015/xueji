import { describe, expect, it } from 'vitest'
import { defaultSenseOpen } from './monitorSenseOpen'

describe('defaultSenseOpen', () => {
  it('非手机或用户已点过：不自动改', () => {
    expect(
      defaultSenseOpen({
        isPhone: false,
        userTouched: false,
        insightCount: 2,
        pendingCount: 0,
      }),
    ).toBeNull()
    expect(
      defaultSenseOpen({
        isPhone: true,
        userTouched: true,
        insightCount: 2,
        pendingCount: 3,
      }),
    ).toBeNull()
  })

  it('手机有待处理：默认收起', () => {
    expect(
      defaultSenseOpen({
        isPhone: true,
        userTouched: false,
        insightCount: 3,
        pendingCount: 1,
      }),
    ).toBe(false)
  })

  it('手机无待处理：有洞察则展开', () => {
    expect(
      defaultSenseOpen({
        isPhone: true,
        userTouched: false,
        insightCount: 1,
        pendingCount: 0,
      }),
    ).toBe(true)
    expect(
      defaultSenseOpen({
        isPhone: true,
        userTouched: false,
        insightCount: 0,
        pendingCount: 0,
      }),
    ).toBe(false)
  })
})
