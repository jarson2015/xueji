/**
 * Async load / write helpers for race-safe refreshes and coalesced polling.
 */

/** Only the latest begin() token may apply results (丢弃过期响应). */
export function createLoadGate() {
  let seq = 0
  return {
    next() {
      const id = ++seq
      return {
        id,
        isCurrent: () => id === seq,
      }
    },
  }
}

type CoalesceOpts = {
  /** Debounce window before running; default 400ms */
  waitMs?: number
}

/**
 * Merge bursty refresh triggers into one in-flight run.
 * schedule() debounces; if a run is in flight, marks pending and re-runs once after.
 */
export function createCoalescedAsync(
  run: () => Promise<void>,
  opts?: CoalesceOpts,
) {
  const waitMs = opts?.waitMs ?? 400
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<void> | null = null
  let pending = false

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function flush() {
    clearTimer()
    if (inFlight) {
      pending = true
      return inFlight
    }
    pending = false
    inFlight = (async () => {
      try {
        await run()
      } finally {
        inFlight = null
        if (pending) {
          pending = false
          await flush()
        }
      }
    })()
    return inFlight
  }

  function schedule() {
    pending = true
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, waitMs)
  }

  /** Cancel pending debounce (does not abort in-flight). */
  function cancel() {
    clearTimer()
    pending = false
  }

  /** Run immediately (e.g. first mount), skipping debounce. */
  function runNow() {
    clearTimer()
    return flush()
  }

  return { schedule, flush, cancel, runNow }
}

/** Return false if already busy; otherwise set busy and return true. */
export function tryBegin(busy: { value: boolean }): boolean {
  if (busy.value) return false
  busy.value = true
  return true
}
