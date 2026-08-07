/** 离线打卡队列 — localStorage 持久化，上线后 flush */

import { ref } from 'vue'

const KEY = 'xueji.offlineCheckins'

export type OfflineCheckinItem = {
  clientId: string
  payload: Record<string, unknown>
  createdAt: string
  retries: number
}

/** Bumped when queue length may have changed — StudentLayout watches this */
export const offlineQueueTick = ref(0)

function bumpOfflineQueue() {
  offlineQueueTick.value += 1
}

function load(): OfflineCheckinItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function save(items: OfflineCheckinItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
  bumpOfflineQueue()
}

export function queueOfflineCheckin(payload: Record<string, unknown>) {
  const clientId =
    (payload.clientId as string) ||
    `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const items = load()
  items.push({
    clientId,
    payload: { ...payload, clientId },
    createdAt: new Date().toISOString(),
    retries: 0,
  })
  save(items)
  return clientId
}

export function listOfflineCheckins() {
  return load()
}

export function offlineQueueCount() {
  return load().length
}

export function removeOfflineCheckin(clientId: string) {
  save(load().filter((x) => x.clientId !== clientId))
}

export async function flushOfflineQueue(
  post: (payload: Record<string, unknown>) => Promise<unknown>,
) {
  const items = load()
  if (!items.length) return { ok: 0, fail: 0, dropped: 0 }
  let ok = 0
  let fail = 0
  let dropped = 0
  const remain: OfflineCheckinItem[] = []
  for (const item of items) {
    try {
      await post(item.payload)
      ok++
    } catch {
      item.retries += 1
      if (item.retries < 5) {
        remain.push(item)
        fail++
      } else {
        dropped++
      }
    }
  }
  save(remain)
  return { ok, fail, dropped }
}
