/* Service Worker — Web Push for 学迹 */
self.addEventListener('push', (event) => {
  let data = { title: '学迹', body: '有新提醒', url: '/', tag: 'study' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    try {
      data.body = event.data.text()
    } catch {
      // ignore
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || '学迹', {
      body: data.body || '',
      tag: data.tag || 'study',
      data: { url: data.url || '/' },
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    }),
  )
})
