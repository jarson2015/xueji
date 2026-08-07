import http from '../api/http'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function ensurePushSubscription(): Promise<{
  ok: boolean
  reason?: string
}> {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' }
  }
  if (!window.isSecureContext && location.hostname !== 'localhost') {
    return { ok: false, reason: 'insecure' }
  }

  try {
    const meta: any = await http.get('/push/vapid-public-key')
    if (!meta?.enabled || !meta.publicKey) {
      return { ok: false, reason: 'disabled' }
    }

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied' }
    }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(meta.publicKey),
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: 'bad-sub' }
    }
    await http.post('/push/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'error' }
  }
}
