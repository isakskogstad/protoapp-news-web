'use client'

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, X } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'

// Storage key for notification history
const NOTIFICATION_HISTORY_KEY = 'notification_history'

// Data structure for notification history items
export interface NotificationHistoryItem {
  id: string
  companyName: string
  headline: string
  timestamp: string
  read: boolean
  newsId: string
}

// Context for sharing notification history state
interface NotificationHistoryContextType {
  items: NotificationHistoryItem[]
  unreadCount: number
  addNotification: (item: Omit<NotificationHistoryItem, 'id' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearHistory: () => void
}

const NotificationHistoryContext = createContext<NotificationHistoryContextType | null>(null)

// Hook to access notification history from anywhere in the app
export function useNotificationHistory() {
  const context = useContext(NotificationHistoryContext)
  if (!context) {
    throw new Error('useNotificationHistory must be used within a NotificationHistoryProvider')
  }
  return context
}

// Provider component to wrap the app
export function NotificationHistoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationHistoryItem[]>([])

  // Load items from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(NOTIFICATION_HISTORY_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      } catch (e) {
        console.error('Failed to parse notification history:', e)
      }
    }
  }, [])

  // Save items to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(items))
  }, [items])

  const unreadCount = items.filter(item => !item.read).length

  const addNotification = useCallback((item: Omit<NotificationHistoryItem, 'id' | 'read'>) => {
    const newItem: NotificationHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
    }
    setItems(prev => {
      // Add to front, limit to 20 items
      const updated = [newItem, ...prev].slice(0, 20)
      return updated
    })
  }, [])

  const markAsRead = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, read: true } : item
    ))
  }, [])

  const markAllAsRead = useCallback(() => {
    setItems(prev => prev.map(item => ({ ...item, read: true })))
  }, [])

  const clearHistory = useCallback(() => {
    setItems([])
  }, [])

  return (
    <NotificationHistoryContext.Provider value={{
      items,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearHistory,
    }}>
      {children}
    </NotificationHistoryContext.Provider>
  )
}

// Format timestamp to relative time in Swedish
function formatRelativeTimestamp(timestamp: string): string {
  try {
    const date = parseISO(timestamp)
    return formatDistanceToNow(date, { addSuffix: true, locale: sv })
  } catch {
    return timestamp
  }
}

// Truncate headline to a reasonable length
function truncateHeadline(headline: string, maxLength: number = 60): string {
  if (!headline) return 'Ny nyhet'
  if (headline.length <= maxLength) return headline
  return headline.substring(0, maxLength).trim() + '...'
}

// Main dropdown component
export default function NotificationHistory() {
  const router = useRouter()
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotificationHistory()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleNotificationClick = (item: NotificationHistoryItem) => {
    markAsRead(item.id)
    setIsOpen(false)
    router.push(`/news/${item.newsId}`)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with unread count badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        aria-label={`Notifikationshistorik${unreadCount > 0 ? `, ${unreadCount} olästa` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-black dark:text-white">
              Notifikationer
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({unreadCount} olästa)
                </span>
              )}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Stäng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Inga notifikationer
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Nya nyheter visas här
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNotificationClick(item)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-start gap-3"
                    >
                      {/* Unread indicator */}
                      <div className="flex-shrink-0 mt-1.5">
                        {!item.read ? (
                          <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-transparent block" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          item.read
                            ? 'text-gray-500 dark:text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {item.companyName}
                        </p>
                        <p className={`text-sm mt-0.5 line-clamp-2 leading-snug ${
                          item.read
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {truncateHeadline(item.headline)}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {formatRelativeTimestamp(item.timestamp)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer with mark all as read button */}
          {items.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Markera alla som lästa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
