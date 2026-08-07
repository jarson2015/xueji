import { ref, type Ref } from 'vue'
import { io, Socket } from 'socket.io-client'

/** Module-level singleton — survives route changes within the same role shell */
let shared: Socket | null = null
let sharedToken = ''
export const socketConnected: Ref<boolean> = ref(false)

export function ensureSharedSocket(token: string) {
  if (shared && sharedToken === token) return shared
  if (shared) {
    shared.disconnect()
    shared = null
  }
  if (!token) return null
  sharedToken = token
  const s = io('/ws', {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  })
  s.on('connect', () => {
    socketConnected.value = true
  })
  s.on('disconnect', () => {
    socketConnected.value = false
  })
  shared = s
  return s
}

export function getSharedSocket() {
  return shared
}

/** Call on logout so the next login gets a fresh socket */
export function disconnectSharedSocket() {
  if (shared) {
    shared.disconnect()
    shared = null
    sharedToken = ''
    socketConnected.value = false
  }
}
