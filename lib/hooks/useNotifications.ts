'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  isNotificationSupported,
  isServiceWorkerSupported,
  getNotificationPermission,
  enableNotifications,
  unsubscribeFromPush,
  isSubscribed,
  showNotification,
  showNotificationWithSound,
  getBrowserInfo,
  getNotificationInstructions,
} from '@/lib/notifications'

export interface UseNotificationsReturn {
  // State
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  enabled: boolean
  loading: boolean
  browserInfo: { name: string; supportLevel: 'full' | 'partial' | 'none' }

  // Actions
  enable: () => Promise<boolean>
  disable: () => Promise<boolean>
  toggle: () => Promise<boolean>
  showNotification: (title: string, body: string, url?: string) => Promise<void>
  showNotificationWithSound: (title: string, body: string, url?: string) => Promise<void>

  // Helpers
  instructions: string
}

export function useNotifications(): UseNotificationsReturn {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [browserInfo, setBrowserInfo] = useState<{ name: string; supportLevel: 'full' | 'partial' | 'none' }>({
    name: 'unknown',
    supportLevel: 'none',
  })

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setSupported(isNotificationSupported())
      setPermission(getNotificationPermission())
      setBrowserInfo(getBrowserInfo())

      // Register service worker
      if (isServiceWorkerSupported()) {
        try {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          await navigator.serviceWorker.ready
        } catch (err) {
          console.log('Service worker registration failed:', err)
        }
      }

      // Check if already subscribed
      const subscribed = await isSubscribed()
      setEnabled(subscribed)
      setLoading(false)
    }

    init()
  }, [])

  // Listen for permission changes
  useEffect(() => {
    if (!isNotificationSupported()) return

    // Check permission periodically (some browsers don't have permission change events)
    const interval = setInterval(() => {
      const newPermission = getNotificationPermission()
      if (newPermission !== permission) {
        setPermission(newPermission)
        if (newPermission === 'denied') {
          setEnabled(false)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [permission])

  const enable = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const success = await enableNotifications()
      setEnabled(success)
      setPermission(getNotificationPermission())

      if (success) {
        // Show confirmation notification
        await showNotification(
          'Notiser aktiverade',
          'Du får nu notiser om viktiga affärshändelser'
        )
      }

      return success
    } finally {
      setLoading(false)
    }
  }, [])

  const disable = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const success = await unsubscribeFromPush()
      if (success) {
        setEnabled(false)
      }
      return success
    } finally {
      setLoading(false)
    }
  }, [])

  const toggle = useCallback(async (): Promise<boolean> => {
    if (enabled) {
      return disable()
    } else {
      return enable()
    }
  }, [enabled, enable, disable])

  // Show notifications - check permission directly, not React state
  // This allows notifications to work even when enabled in another component
  const show = useCallback(async (title: string, body: string, url?: string): Promise<void> => {
    // Check actual permission and localStorage, not React state
    if (Notification.permission !== 'granted') return
    if (localStorage.getItem('loopdesk_notifications_enabled') !== 'true') return
    await showNotification(title, body, url)
  }, [])

  const showWithSound = useCallback(async (title: string, body: string, url?: string): Promise<void> => {
    // Check actual permission and localStorage, not React state
    if (Notification.permission !== 'granted') return
    if (localStorage.getItem('loopdesk_notifications_enabled') !== 'true') return
    await showNotificationWithSound(title, body, url)
  }, [])

  return {
    supported,
    permission,
    enabled,
    loading,
    browserInfo,
    enable,
    disable,
    toggle,
    showNotification: show,
    showNotificationWithSound: showWithSound,
    instructions: getNotificationInstructions(),
  }
}
