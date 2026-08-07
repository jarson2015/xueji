import { describe, expect, it } from 'vitest'
import { buildNudgeSuccessToast, numKeyLabel } from './loginNudgeCopy'

describe('loginNudgeCopy', () => {
  it('码键有可读名称', () => {
    expect(numKeyLabel('del')).toBe('删除一位')
    expect(numKeyLabel('清空')).toBe('清空登录码')
    expect(numKeyLabel('3')).toBe('数字 3')
  })

  it('提醒成功：有 parentHint 用它，否则默认一句', () => {
    expect(buildNudgeSuccessToast('小明', '今天已经提醒 3 次了')).toBe(
      '今天已经提醒 3 次了',
    )
    expect(buildNudgeSuccessToast('小明', '  ')).toBe('已轻轻提醒 小明')
    expect(buildNudgeSuccessToast('小红')).toBe('已轻轻提醒 小红')
  })
})
