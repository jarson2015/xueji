import { describe, expect, it } from 'vitest'
import {
  buildFingerFulfillSoftCopy,
  buildNormalFulfillSoftCopy,
  matchChoreByNote,
} from './fulfillSoftCopy'

describe('fulfillSoftCopy', () => {
  it('普通兑现含愿望与孩子名', () => {
    const c = buildNormalFulfillSoftCopy({
      wish: { title: '公园玩一圈' },
      student: { name: '小明' },
    })
    expect(c.mode).toBe('normal')
    expect(c.message).toContain('公园玩一圈')
    expect(c.message).toContain('小明')
    expect(c.confirmText).toBe('已给到')
  })

  it('互助卡：0 / 1 / 多件分支', () => {
    const empty = buildFingerFulfillSoftCopy({ wish: { title: '互助卡' } }, [])
    expect(empty.mode).toBe('fingerEmpty')
    expect(empty.message).toContain('没有可免的家务')

    const one = buildFingerFulfillSoftCopy({}, [{ title: '洗碗' }])
    expect(one.mode).toBe('finger')
    expect(one.message).toContain('洗碗')
    expect(one.message).toContain('免做不是责任消失')

    const many = buildFingerFulfillSoftCopy({}, [
      { title: '洗碗' },
      { title: '拖地' },
    ])
    expect(many.mode).toBe('fingerPick')
    expect(many.templates).toEqual(['洗碗', '拖地'])
    expect(many.confirmText).toBe('兑现并免家务')
    expect(many.requireNote).toBe(true)
  })

  it('matchChoreByNote 支持标题与序号', () => {
    const chores = [{ title: '洗碗', id: 1 }, { title: '拖地', id: 2 }]
    expect(matchChoreByNote('拖地', chores)?.id).toBe(2)
    expect(matchChoreByNote('1', chores)?.id).toBe(1)
    expect(matchChoreByNote('无', chores)).toBeNull()
  })
})
