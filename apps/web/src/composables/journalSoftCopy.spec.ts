import { describe, expect, it } from 'vitest'
import {
  JOURNAL_COMMENT_PROMPTS,
  JOURNAL_POST_PROMPTS,
  buildClosePrivateDiaryCopy,
  buildDeleteDiaryCopy,
  buildDeletePostCopy,
  buildEnablePrivateDiaryCopy,
  buildProxyComposeHint,
  buildShareForceCopy,
  buildShareLayer1Copy,
  buildShareLayer2Copy,
  shareCopyAssertsNoPrivateLeak,
} from './journalSoftCopy'

describe('journalSoftCopy', () => {
  it('开启 / 关闭私密（默认私密日记）', () => {
    const open = buildEnablePrivateDiaryCopy()
    expect(open.confirmText).toBe('自愿开启')
    expect(open.title).toContain('私密日记')
    const close = buildClosePrivateDiaryCopy()
    expect(close.title).toContain('关闭')
    expect(close.message).toContain('只读')
    expect(close.message).toContain('不会开放给家长')
  })

  it('幼龄开启 / 关闭用悄悄话', () => {
    const open = buildEnablePrivateDiaryCopy('young')
    expect(open.title).toBe('自愿开启悄悄话')
    expect(open.message).toContain('悄悄话')
    expect(open.message).not.toContain('私密日记')
    const close = buildClosePrivateDiaryCopy('young')
    expect(close.title).toBe('关闭悄悄话？')
    expect(close.message).toContain('悄悄话')
  })

  it('删帖 / 删日记（产品名）', () => {
    expect(buildDeletePostCopy('练琴', { deletingOthers: true }).message).toContain(
      '家人写下的表达',
    )
    expect(buildDeletePostCopy(undefined).message).toContain('家庭说说')
    expect(buildDeletePostCopy(undefined).title).toBe('删除这条说说？')
    expect(
      buildDeletePostCopy(undefined, { ageBand: 'young' }).title,
    ).toBe('删除这条给家人看？')
    expect(buildDeleteDiaryCopy('安静').title).toContain('私密日记')
    expect(buildDeleteDiaryCopy('安静', 'young').title).toBe('删除悄悄话？')
  })

  it('分享双层与 force（隐私句式不变）', () => {
    const l1 = buildShareLayer1Copy('今天想安静一会儿')
    const l2 = buildShareLayer2Copy('parents')
    expect(shareCopyAssertsNoPrivateLeak(l1, buildShareLayer2Copy('family'))).toBe(
      true,
    )
    expect(l1.title).toContain('家庭说说')
    expect(l2.message).toContain('仅家长')
    expect(buildShareForceCopy().confirmText).toBe('仍要再发')
    expect(buildShareForceCopy().message).toContain('家庭说说')

    const y1 = buildShareLayer1Copy('摘要', { ageBand: 'young' })
    const y2 = buildShareLayer2Copy('family', { ageBand: 'young' })
    expect(shareCopyAssertsNoPrivateLeak(y1, y2)).toBe(true)
    expect(y1.title).toBe('分享到给家人看？')
    expect(y1.message).toContain('悄悄话')
  })

  it('productName 覆盖', () => {
    const c = buildShareLayer1Copy('x', { productName: '自定义名' })
    expect(c.title).toBe('分享到自定义名？')
    expect(c.message).toContain('「自定义名」')
  })

  it('话术芯片非空', () => {
    expect(JOURNAL_POST_PROMPTS.length).toBeGreaterThan(0)
    expect(JOURNAL_COMMENT_PROMPTS).toContain('看见你了')
    expect(buildProxyComposeHint()).toContain('孩子名下')
  })
})
