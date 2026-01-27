'use client'

// Check if basic notifications are supported (works in Safari and Chrome)
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

// Check if push notifications are supported (Chrome, Firefox - not Safari)
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
         'serviceWorker' in navigator &&
         'PushManager' in window
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Failed to request notification permission:', error)
    return 'denied'
  }
}

// Register service worker (for Chrome push notifications)
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return registration
  } catch (error) {
    console.error('Failed to register service worker:', error)
    return null
  }
}

// Subscribe to push notifications (Chrome only)
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await registerServiceWorker()
    if (!registration) return null

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        ) as BufferSource,
      })
    }

    localStorage.setItem('loopdesk_push_subscription', JSON.stringify(subscription))
    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

// Unsubscribe from push
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    localStorage.removeItem('loopdesk_notifications_enabled')
    return true
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    localStorage.removeItem('loopdesk_push_subscription')
    localStorage.removeItem('loopdesk_notifications_enabled')
    return true
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return false
  }
}

// Check if user has notifications enabled
export async function isSubscribed(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission !== 'granted') return false

  // Check localStorage flag for Safari
  const enabled = localStorage.getItem('loopdesk_notifications_enabled')
  if (enabled === 'true') return true

  // Check push subscription for Chrome
  if (isPushSupported()) {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return !!subscription
    } catch {
      return false
    }
  }

  return false
}

// Enable notifications (works for both Safari and Chrome)
export async function enableNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) return false

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return false

  // Try push subscription first (Chrome)
  if (isPushSupported()) {
    const subscription = await subscribeToPush()
    if (subscription) {
      localStorage.setItem('loopdesk_notifications_enabled', 'true')
      return true
    }
  }

  // Fallback: just enable local notifications (Safari)
  localStorage.setItem('loopdesk_notifications_enabled', 'true')
  return true
}

// Show a notification (works in both Safari and Chrome)
export async function showNotification(title: string, body: string, url?: string): Promise<void> {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'loopdesk-' + Date.now(),
    data: { url: url || '/' },
  }

  // Try service worker notification first (Chrome - better features)
  if (isPushSupported()) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
      return
    } catch (error) {
      console.log('Service worker notification failed, using fallback:', error)
    }
  }

  // Fallback: native Notification API (Safari and fallback)
  try {
    const notification = new Notification(title, options)

    notification.onclick = () => {
      window.focus()
      if (url) {
        window.location.href = url
      }
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  } catch (error) {
    console.error('Failed to show notification:', error)
  }
}

// Legacy alias for backward compatibility
export const showLocalNotification = showNotification

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
