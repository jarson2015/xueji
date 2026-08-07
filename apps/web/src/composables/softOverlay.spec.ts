import { describe, expect, it } from 'vitest'
import { softStayOwnsEscape } from './softOverlay'

describe('softStayOwnsEscape', () => {
  it('无 SoftPrompt 蒙层时 SoftStay 可处理 Esc', () => {
    const root = document.implementation.createHTMLDocument('t')
    root.body.innerHTML = '<div class="soft-stay"></div>'
    expect(softStayOwnsEscape(root)).toBe(true)
  })

  it('有 .sp-mask 时 SoftStay 不抢 Esc', () => {
    const root = document.implementation.createHTMLDocument('t')
    root.body.innerHTML = '<div class="sp-mask"></div><div class="soft-stay"></div>'
    expect(softStayOwnsEscape(root)).toBe(false)
  })
})
