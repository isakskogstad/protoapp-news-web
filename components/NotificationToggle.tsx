'use client'

import { useState, useEffect } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  enableNotifications,
  unsubscribeFromPush,
  isSubscribed,
} from '@/lib/notifications'

export default function NotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const isSupported = isNotificationSupported()
      setSupported(isSupported)

      if (isSupported) {
        setPermission(getNotificationPermission())
        const isSub = await isSubscribed()
        setSubscribed(isSub)
      }
    }
    checkStatus()
  }, [])

  const handleToggle = async () => {
    if (!supported) return

    setLoading(true)
    try {
      if (subscribed) {
        // Unsubscribe
        await unsubscribeFromPush()
        setSubscribed(false)
      } else {
        // Enable notifications (handles permission request + subscription + localStorage flag)
        const success = await enableNotifications()
        setPermission(getNotificationPermission())
        setSubscribed(success)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={handleToggle}
      disabled={loading || permission === 'denied'}
      className={`
        p-2 rounded-lg transition-colors
        ${subscribed
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'}
        disabled:opacity-50
      `}
      aria-label={subscribed ? 'Stäng av notiser' : 'Aktivera notiser'}
      title={
        permission === 'denied'
          ? 'Notiser är blockerade i webbläsaren'
          : subscribed
          ? 'Notiser aktiverade'
          : 'Aktivera notiser'
      }
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {subscribed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          )}
        </svg>
      )}
    </button>
  )
}
