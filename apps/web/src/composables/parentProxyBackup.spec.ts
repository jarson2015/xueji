import { describe, expect, it } from 'vitest'
import { parseParentProxyBackup } from './parentProxyBackup'

describe('parseParentProxyBackup', () => {
  it('有效备份可解析', () => {
    const b = parseParentProxyBackup(
      JSON.stringify({ token: 't1', user: { id: 1, role: 'parent' } }),
    )
    expect(b?.token).toBe('t1')
    expect((b?.user as any).id).toBe(1)
  })

  it('缺失或损坏返回 null', () => {
    expect(parseParentProxyBackup(null)).toBeNull()
    expect(parseParentProxyBackup('')).toBeNull()
    expect(parseParentProxyBackup('{')).toBeNull()
    expect(parseParentProxyBackup(JSON.stringify({ token: 't' }))).toBeNull()
    expect(parseParentProxyBackup(JSON.stringify({ user: {} }))).toBeNull()
  })
})
