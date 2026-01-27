'use client'

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' &&
         'Notification' in window &&
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

// Register service worker and subscribe to push
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isNotificationSupported()) return null

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription (using a dummy VAPID key for demo)
      // In production, you'd use a real VAPID key pair
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        ) as BufferSource,
      })
    }

    // Store subscription in localStorage (in production, send to server)
    localStorage.setItem('loopdesk_push_subscription', JSON.stringify(subscription))

    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

// Unsubscribe from push
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    localStorage.removeItem('loopdesk_push_subscription')
    return true
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return false
  }
}

// Check if user is subscribed
export async function isSubscribed(): Promise<boolean> {
  if (!isNotificationSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

// Show a local notification (for testing)
export async function showLocalNotification(title: string, body: string, url?: string): Promise<void> {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'loopdesk-local',
      data: { url: url || '/' },
    })
  } catch (error) {
    console.error('Failed to show notification:', error)
  }
}

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
