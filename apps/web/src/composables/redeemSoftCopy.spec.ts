import { describe, expect, it } from 'vitest'
import {
  buildRedeemSoftCopy,
  buildRedeemStayMessage,
  buildAckStayMessage,
} from './redeemSoftCopy'

describe('redeemSoftCopy', () => {
  it('normal：确认兑换文案', () => {
    const c = buildRedeemSoftCopy('normal', { title: '公园玩', costPoints: 15 })
    expect(c.title).toBe('确认兑换')
    expect(c.message).toContain('15 积分兑换「公园玩」')
    expect(c.confirmText).toContain('家长保管')
  })

  it('finger：互助卡文案', () => {
    const c = buildRedeemSoftCopy('finger', { title: '缓缓洗碗', costPoints: 20 })
    expect(c.title).toContain('家庭互助卡')
    expect(c.message).toContain('不是买免做')
  })

  it('pact：余额不足还约定时有警告', () => {
    const c = buildRedeemSoftCopy(
      'pact',
      { title: '电影', costPoints: 30 },
      { pactOwed: 40, balance: 50 },
    )
    expect(c.title).toBe('积分约定提醒')
    expect(c.message).toContain('可能不够还约定')
    expect(c.confirmText).toBe('仍要兑换')
  })

  it('stay / ack', () => {
    expect(buildRedeemStayMessage()).toContain('等待兑现')
    expect(buildRedeemStayMessage('golden_finger')).toContain('家庭互助卡')
    expect(buildAckStayMessage()).toBe('已告诉家长你收到了')
  })
})
