import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../api/http', () => ({
  default: {
    get: vi.fn(),
  },
}))

import http from '../api/http'
import {
  applySettingsFlags,
  useFeatureFlags,
} from './useFeatureFlags'
import { useAuthStore } from '../stores/auth'

describe('useFeatureFlags', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(http.get).mockReset()
    applySettingsFlags({
      allowanceLedgerEnabled: false,
      pointsPactEnabled: false,
    })
  })

  it('shares the same flags object across calls', () => {
    const a = useFeatureFlags()
    const b = useFeatureFlags()
    expect(a.flags).toBe(b.flags)
  })

  it('refresh updates shared flags for parent', async () => {
    const auth = useAuthStore()
    auth.user = {
      id: 1,
      username: 'p',
      name: '家长',
      role: 'parent',
      pointsBalance: 0,
    }
    vi.mocked(http.get).mockResolvedValue({
      allowanceLedgerEnabled: true,
      pointsPactEnabled: true,
    })
    const { flags, refresh } = useFeatureFlags()
    await refresh()
    expect(flags.allowance).toBe(true)
    expect(flags.pacts).toBe(true)
    const again = useFeatureFlags()
    expect(again.flags.allowance).toBe(true)
  })

  it('applySettingsFlags writes shared state without GET', () => {
    applySettingsFlags({
      allowanceLedgerEnabled: false,
      pointsPactEnabled: true,
    })
    const { flags } = useFeatureFlags()
    expect(flags.allowance).toBe(false)
    expect(flags.pacts).toBe(true)
  })
})
