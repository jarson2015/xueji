import { ref } from 'vue'

/** Bumped when student should soft-refresh task/today lists */
export const taskSyncTick = ref(0)

/** Bumped when pact list / balances should soft-refresh */
export const pactSyncTick = ref(0)

/** Bumped when covenant / proposals should soft-refresh */
export const covenantSyncTick = ref(0)

export type TaskAssignedNotice = {
  taskId: number
  assignId: number
  title: string
  message: string
  at: string
}

export function bumpTaskSync() {
  taskSyncTick.value += 1
}

export function bumpPactSync() {
  pactSyncTick.value += 1
}

export function bumpCovenantSync() {
  covenantSyncTick.value += 1
}
