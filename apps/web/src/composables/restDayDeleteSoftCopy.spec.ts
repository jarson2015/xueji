import { describe, expect, it } from 'vitest'
import {
  buildDeleteTaskSoftMessage,
  buildRestDayBringSoftMessage,
  DELETE_TASK_SOFT,
  REST_DAY_SOFT,
} from './restDayDeleteSoftCopy'

describe('restDayDeleteSoftCopy', () => {
  it('休息日文案含先不催与自愿', () => {
    const msg = buildRestDayBringSoftMessage()
    expect(msg).toContain('先不催')
    expect(msg).toContain('自愿')
    expect(REST_DAY_SOFT.confirmText).toBe('拿到今日')
    expect(REST_DAY_SOFT.cancelText).toBe('先休息')
  })

  it('删任务说明孩子立刻看不到且保留历史', () => {
    const msg = buildDeleteTaskSoftMessage('朗读 10 分钟')
    expect(msg).toContain('朗读 10 分钟')
    expect(msg).toContain('立刻看不到')
    expect(msg).toContain('历史打卡')
    expect(DELETE_TASK_SOFT.title).toBe('删除任务')
  })
})
