import { describe, expect, it } from 'vitest'
import {
  journalComposeTitle,
  journalDeleteTitle,
  journalEmptyTitle,
  journalLead,
  journalPrivateName,
  journalProductName,
  journalShareAction,
} from './journalLabels'

describe('journalLabels', () => {
  it('幼龄：给家人看 / 我的悄悄话', () => {
    expect(journalProductName('young')).toBe('给家人看')
    expect(journalPrivateName('young')).toBe('我的悄悄话')
    expect(journalLead('young')).toBe('写给家人看的小事 · 不计分')
    expect(journalEmptyTitle('young')).toBe('还没有写给家人看的话')
    expect(journalComposeTitle('young')).toBe('写给家人看')
    expect(journalShareAction('young')).toBe('分享到给家人看')
    expect(journalDeleteTitle('young')).toBe('删除这条给家人看？')
  })

  it('general / teen / 缺省：家庭说说 / 我的私密日记', () => {
    for (const band of [undefined, 'general', 'teen', ''] as const) {
      expect(journalProductName(band)).toBe('家庭说说')
      expect(journalPrivateName(band)).toBe('我的私密日记')
      expect(journalLead(band)).toBe('我们的成长记录 · 不计分、不进待办')
      expect(journalEmptyTitle(band)).toBe('还没有家庭说说')
      expect(journalComposeTitle(band)).toBe('写一条说说')
      expect(journalShareAction(band)).toBe('分享到家庭说说')
      expect(journalDeleteTitle(band)).toBe('删除这条说说？')
    }
  })
})
