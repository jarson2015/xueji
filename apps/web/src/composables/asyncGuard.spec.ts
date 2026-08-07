import { describe, expect, it, vi } from 'vitest'
import {
  createCoalescedAsync,
  createLoadGate,
  tryBegin,
} from './asyncGuard'

describe('createLoadGate', () => {
  it('only latest ticket is current', () => {
    const gate = createLoadGate()
    const a = gate.next()
    const b = gate.next()
    expect(a.isCurrent()).toBe(false)
    expect(b.isCurrent()).toBe(true)
  })
})

describe('tryBegin', () => {
  it('blocks while busy', () => {
    const busy = { value: false }
    expect(tryBegin(busy)).toBe(true)
    expect(busy.value).toBe(true)
    expect(tryBegin(busy)).toBe(false)
    busy.value = false
    expect(tryBegin(busy)).toBe(true)
  })
})

describe('createCoalescedAsync', () => {
  it('merges scheduled calls into one run after wait', async () => {
    vi.useFakeTimers()
    const run = vi.fn(async () => undefined)
    const c = createCoalescedAsync(run, { waitMs: 400 })
    c.schedule()
    c.schedule()
    c.schedule()
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(400)
    expect(run).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('runNow skips debounce', async () => {
    const run = vi.fn(async () => undefined)
    const c = createCoalescedAsync(run, { waitMs: 400 })
    await c.runNow()
    expect(run).toHaveBeenCalledTimes(1)
  })
})
