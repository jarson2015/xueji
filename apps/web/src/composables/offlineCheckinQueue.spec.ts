import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  flushOfflineQueue,
  offlineQueueCount,
  offlineQueueTick,
  queueOfflineCheckin,
  removeOfflineCheckin,
} from './offlineCheckinQueue'

describe('offlineCheckinQueue', () => {
  beforeEach(() => {
    localStorage.clear()
    offlineQueueTick.value = 0
  })

  it('bumps tick when queueing', () => {
    const before = offlineQueueTick.value
    queueOfflineCheckin({ planItemId: 1 })
    expect(offlineQueueCount()).toBe(1)
    expect(offlineQueueTick.value).toBeGreaterThan(before)
  })

  it('drops items after 5 failed flushes and reports dropped', async () => {
    queueOfflineCheckin({ planItemId: 1, clientId: 'c1' })
    const fail = vi.fn().mockRejectedValue(new Error('offline'))
    for (let i = 0; i < 4; i++) {
      const r = await flushOfflineQueue(fail)
      expect(r.fail).toBe(1)
      expect(r.dropped).toBe(0)
      expect(offlineQueueCount()).toBe(1)
    }
    const last = await flushOfflineQueue(fail)
    expect(last.dropped).toBe(1)
    expect(last.fail).toBe(0)
    expect(offlineQueueCount()).toBe(0)
  })

  it('removeOfflineCheckin deletes one item', () => {
    queueOfflineCheckin({ planItemId: 1, clientId: 'a' })
    queueOfflineCheckin({ planItemId: 2, clientId: 'b' })
    expect(offlineQueueCount()).toBe(2)
    removeOfflineCheckin('a')
    expect(offlineQueueCount()).toBe(1)
  })

  it('flush empty queue returns zeros', async () => {
    const post = vi.fn()
    const r = await flushOfflineQueue(post)
    expect(r).toEqual({ ok: 0, fail: 0, dropped: 0 })
    expect(post).not.toHaveBeenCalled()
  })
})
