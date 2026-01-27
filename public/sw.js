// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || 'Ny händelse i LoopDesk',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'loopdesk-notification',
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Öppna' },
      { action: 'dismiss', title: 'Avfärda' },
    ],
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'LoopDesk', options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
