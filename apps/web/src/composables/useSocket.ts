import { onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  disconnectSharedSocket,
  ensureSharedSocket,
  getSharedSocket,
  socketConnected,
} from './socketShared'

export { disconnectSharedSocket } from './socketShared'

/** Shared Socket.IO connection for parent/student realtime events */
export function useSocket() {
  const auth = useAuthStore()
  const cleanups: Array<() => void> = []

  function connect() {
    return ensureSharedSocket(auth.token)
  }

  function on(event: string, handler: (...args: any[]) => void) {
    const s = connect()
    if (!s) return () => undefined
    s.on(event, handler)
    const off = () => s.off(event, handler)
    cleanups.push(off)
    return off
  }

  function disconnect() {
    for (const off of cleanups.splice(0)) off()
    disconnectSharedSocket()
  }

  // Only detach this component's listeners — keep the shared socket alive
  onUnmounted(() => {
    for (const off of cleanups.splice(0)) off()
  })

  return {
    connected: socketConnected,
    connect,
    on,
    disconnect,
    socket: getSharedSocket,
  }
}
