import { describe, expect, it } from 'vitest'
import {
  buildAcceptGiftSoftCopy,
  buildAcceptPactSoftCopy,
  buildRepayPactSoftCopy,
} from './pactSoftCopy'

describe('pactSoftCopy', () => {
  it('借出强调积分不是钱', () => {
    const c = buildAcceptPactSoftCopy({
      amountPoints: 20,
      borrowerName: '小红',
      dueDate: '2026-08-10',
    })
    expect(c.title).toBe('确认借出')
    expect(c.message).toContain('20')
    expect(c.message).toContain('小红')
    expect(c.message).toContain('积分不是钱')
    expect(c.confirmText).toBe('同意借出')
  })

  it('心意区分不是借的', () => {
    const c = buildAcceptGiftSoftCopy({ fromName: '小明', amountPoints: 5 })
    expect(c.title).toBe('收下心意')
    expect(c.message).toContain('小明')
    expect(c.message).toContain('不是借的')
    expect(c.confirmText).toBe('收下')
  })

  it('还回含说到做到；逾期补分可选', () => {
    const base = buildRepayPactSoftCopy({
      amountDue: 12,
      amountPoints: 10,
      lenderName: '小明',
    })
    expect(base.title).toBe('按约定还回')
    expect(base.message).toContain('12')
    expect(base.message).toContain('说到做到')
    expect(base.message).not.toContain('逾期')
    expect(base.cancelText).toBe('再等等')

    const overdue = buildRepayPactSoftCopy({
      amountDue: 15,
      amountPoints: 10,
      lenderName: '小明',
      overdueExtraDue: 5,
    })
    expect(overdue.message).toContain('逾期补分 5')
  })
})
