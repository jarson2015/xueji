import { describe, expect, it } from 'vitest'
import {
  bumpTaskSync,
  bumpPactSync,
  bumpCovenantSync,
  taskSyncTick,
  pactSyncTick,
  covenantSyncTick,
} from './taskSync'

describe('taskSync ticks', () => {
  it('bumpTaskSync increments taskSyncTick', () => {
    const before = taskSyncTick.value
    bumpTaskSync()
    expect(taskSyncTick.value).toBe(before + 1)
  })

  it('bumpPactSync increments pactSyncTick', () => {
    const before = pactSyncTick.value
    bumpPactSync()
    expect(pactSyncTick.value).toBe(before + 1)
  })

  it('bumpCovenantSync increments covenantSyncTick', () => {
    const before = covenantSyncTick.value
    bumpCovenantSync()
    expect(covenantSyncTick.value).toBe(before + 1)
  })
})
