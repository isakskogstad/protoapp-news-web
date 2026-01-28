'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { NewsItem, ProtocolAnalysis, Kungorelse } from '@/lib/types'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import { showLocalNotification, isSubscribed } from '@/lib/notifications'
import NewsCard from './NewsCard'
import FollowCompanies from './FollowCompanies'
import SSEStatusIndicator from './SSEStatusIndicator'
import { NewsCardSkeleton } from './Skeleton'
import { useSSE, SSEStatus } from '@/lib/hooks/useSSE'
import { NewsToastContainer } from './NewsToast'

interface NewsFeedProps {
  initialItems: NewsItem[]
}

interface FollowSettings {
  enabled: boolean
  mode: 'all' | 'selected'
  selectedCompanies: { org_number: string; company_name: string }[]
}

// Get follow settings from localStorage - moved outside component to avoid recreation
function getFollowSettings(): FollowSettings | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('loopdesk_follow_settings')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

export default function NewsFeed({ initialItems }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [toastQueue, setToastQueue] = useState<NewsItem[]>([])

  // Infinite scroll ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Handle toast dismiss
  const handleToastDismiss = useCallback((id: string) => {
    setToastQueue(prev => prev.filter(item => item.id !== id))
  }, [])

  // Check if we should notify for this item - memoized
  const shouldNotify = useCallback((item: NewsItem): boolean => {
    const settings = getFollowSettings()
    if (!settings || !settings.enabled) return false

    if (settings.mode === 'all') return true

    // Mode is 'selected' - check if the company is in the list
    return settings.selectedCompanies.some(
      c => c.org_number === item.orgNumber || c.org_number.replace('-', '') === item.orgNumber.replace('-', '')
    )
  }, [])

  // SSE message handler - memoized to prevent recreation
  const handleSSEMessage = useCallback((data: unknown) => {
    const message = data as {
      operation?: string
      type?: string
      record?: ProtocolAnalysis | Kungorelse
      old?: { id: string }
    }

    if (message.operation === 'INSERT' && message.record) {
      const newItem = message.type === 'protocol'
        ? protocolToNewsItem(message.record as ProtocolAnalysis)
        : kungorelseToNewsItem(message.record as Kungorelse)

      setItems(prev => {
        if (prev.some(item => item.id === newItem.id)) return prev
        return [newItem, ...prev].slice(0, 100)
      })

      // Show in-app toast notification
      setToastQueue(prev => {
        // Don't add duplicate toasts
        if (prev.some(item => item.id === newItem.id)) return prev
        // Keep max 3 in queue
        return [newItem, ...prev].slice(0, 3)
      })

      // Show browser notification if settings allow
      if (shouldNotify(newItem)) {
        isSubscribed().then(subscribed => {
          if (subscribed) {
            showLocalNotification(
              newItem.companyName,
              newItem.headline || 'Ny händelse',
              `/news/${newItem.id}`
            )
          }
        })
      }
    } else if (message.operation === 'UPDATE' && message.record) {
      const updatedItem = message.type === 'protocol'
        ? protocolToNewsItem(message.record as ProtocolAnalysis)
        : kungorelseToNewsItem(message.record as Kungorelse)

      setItems(prev =>
        prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      )
    } else if (message.operation === 'DELETE') {
      const deletedId = message.old?.id
      if (deletedId) {
        setItems(prev => prev.filter(item => item.id !== deletedId))
      }
    }
  }, [shouldNotify])

  // Use the SSE hook with proper cleanup
  const { status: sseStatus } = useSSE({
    url: '/api/news/stream',
    onMessage: handleSSEMessage,
    enabled: true,
  })

  // Map SSE status to component's expected format
  const connectionStatus = useMemo((): 'connected' | 'connecting' | 'disconnected' | 'error' => {
    return sseStatus as 'connected' | 'connecting' | 'disconnected' | 'error'
  }, [sseStatus])

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/news?offset=${items.length}&limit=20`)
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        setItems(prev => {
          const newItems = data.items.filter(
            (item: NewsItem) => !prev.some(p => p.id === item.id)
          )
          return [...prev, ...newItems]
        })
        if (data.items.length < 20) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Load more error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [items.length, isLoading, hasMore])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [loadMore, isLoading, hasMore])

  return (
    <div className="animate-fade-in">
      {/* Header with Follow button - responsive */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Senaste händelserna
          </h2>
          <SSEStatusIndicator status={connectionStatus} />
        </div>
        <FollowCompanies />
      </div>

      {/* News items - tighter spacing on mobile, more on desktop */}
      <div className="space-y-4 md:space-y-16">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {/* Load more trigger for infinite scroll */}
      <div ref={loadMoreRef}>
        {isLoading && (
          <div className="space-y-4 mt-4">
            <NewsCardSkeleton />
            <NewsCardSkeleton />
          </div>
        )}
        {!isLoading && !hasMore && items.length > 0 && (
          <div className="h-20 flex items-center justify-center">
            <span className="text-sm text-gray-400">Inga fler nyheter</span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          Inga nyheter ännu
        </div>
      )}

      {/* Toast notifications for new items */}
      <NewsToastContainer items={toastQueue} onDismiss={handleToastDismiss} />
    </div>
  )
}
