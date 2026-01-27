'use client'

// Notification system with support for:
// - Chrome: Service Worker + Push API (full features)
// - Safari (macOS 13+): Service Worker notifications
// - Safari (older): Basic Notification API
// - Firefox: Service Worker + Push API

// Check if basic notifications are supported (works in Safari and Chrome)
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

// Check if service workers are supported
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

// Check if push notifications are supported (Chrome, Firefox, Safari 16+)
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
         'serviceWorker' in navigator &&
         'PushManager' in window
}

// Detect browser type
export function getBrowserInfo(): { name: string; supportLevel: 'full' | 'partial' | 'none' } {
  if (typeof window === 'undefined') return { name: 'unknown', supportLevel: 'none' }

  const ua = navigator.userAgent

  if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) {
    // Safari - check version for push support
    const match = ua.match(/Version\/(\d+)/)
    const version = match ? parseInt(match[1]) : 0
    return {
      name: 'Safari',
      supportLevel: version >= 16 ? 'full' : 'partial'
    }
  }

  if (ua.includes('Firefox')) {
    return { name: 'Firefox', supportLevel: 'full' }
  }

  if (ua.includes('Edg')) {
    return { name: 'Edge', supportLevel: 'full' }
  }

  if (ua.includes('Chrome')) {
    return { name: 'Chrome', supportLevel: 'full' }
  }

  return { name: 'unknown', supportLevel: isNotificationSupported() ? 'partial' : 'none' }
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

// VAPID public key (match this with Supabase Edge Function's key)
const VAPID_PUBLIC_KEY = 'BBPSe1YCHVCFeAhzq_x0LB7GugGllBlywbGxDH5w4-s8XHM6bE5a_IHj6Vh4rOhBvknGac8x5VAoxjwBa0t0lwA'

// Subscribe to push notifications (Chrome, Firefox, Safari 16+)
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await registerServiceWorker()
    if (!registration) return null

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    // Save subscription to Supabase
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
    } catch (err) {
      console.log('Failed to save subscription to server:', err)
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
      // Remove from Supabase
      try {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      } catch (err) {
        console.log('Failed to remove subscription from server:', err)
      }

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

// Get browser-specific instructions for enabling notifications
export function getNotificationInstructions(): string {
  const browser = getBrowserInfo()

  switch (browser.name) {
    case 'Safari':
      return 'Safari: Klicka på "Tillåt" i dialogrutan. Du kan hantera behörigheter i Safari > Inställningar > Webbplatser > Notiser.'
    case 'Chrome':
      return 'Chrome: Klicka på "Tillåt". Du kan ändra detta via hänglåset i adressfältet.'
    case 'Firefox':
      return 'Firefox: Klicka på "Tillåt notiser". Hantera via hänglåset i adressfältet.'
    case 'Edge':
      return 'Edge: Klicka på "Tillåt". Hantera via hänglåset i adressfältet.'
    default:
      return 'Tillåt notiser när webbläsaren frågar.'
  }
}

// Show notification with sound option
export async function showNotificationWithSound(
  title: string,
  body: string,
  url?: string,
  playSound = true
): Promise<void> {
  // Play notification sound
  if (playSound && typeof window !== 'undefined') {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch {
      // Ignore audio errors
    }
  }

  await showNotification(title, body, url)
}
