'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { NewsItem, ProtocolAnalysis, Kungorelse } from '@/lib/types'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import { showLocalNotification, isSubscribed } from '@/lib/notifications'
import NewsCard from './NewsCard'
import FollowCompanies from './FollowCompanies'
import SSEStatusIndicator from './SSEStatusIndicator'
import { NewsCardSkeleton } from './Skeleton'

interface NewsFeedProps {
  initialItems: NewsItem[]
}

interface FollowSettings {
  enabled: boolean
  mode: 'all' | 'selected'
  selectedCompanies: { org_number: string; company_name: string }[]
}

export default function NewsFeed({ initialItems }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting')
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Infinite scroll ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Get follow settings from localStorage
  const getFollowSettings = (): FollowSettings | null => {
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

  // Check if we should notify for this item
  const shouldNotify = (item: NewsItem): boolean => {
    const settings = getFollowSettings()
    if (!settings || !settings.enabled) return false

    if (settings.mode === 'all') return true

    // Mode is 'selected' - check if the company is in the list
    return settings.selectedCompanies.some(
      c => c.org_number === item.orgNumber || c.org_number.replace('-', '') === item.orgNumber.replace('-', '')
    )
  }

  // Connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      eventSource = new EventSource('/api/news/stream')

      eventSource.addEventListener('connected', () => {
        setConnectionStatus('connected')
      })

      eventSource.addEventListener('change', (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.operation === 'INSERT') {
            const newItem = data.type === 'protocol'
              ? protocolToNewsItem(data.record as ProtocolAnalysis)
              : kungorelseToNewsItem(data.record as Kungorelse)

            setItems(prev => {
              if (prev.some(item => item.id === newItem.id)) return prev
              return [newItem, ...prev].slice(0, 100)
            })

            // Show notification if settings allow
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
          } else if (data.operation === 'UPDATE') {
            const updatedItem = data.type === 'protocol'
              ? protocolToNewsItem(data.record as ProtocolAnalysis)
              : kungorelseToNewsItem(data.record as Kungorelse)

            setItems(prev =>
              prev.map(item => item.id === updatedItem.id ? updatedItem : item)
            )
          } else if (data.operation === 'DELETE') {
            const deletedId = data.old?.id
            if (deletedId) {
              setItems(prev => prev.filter(item => item.id !== deletedId))
            }
          }
        } catch (err) {
          console.error('SSE parse error:', err)
        }
      })

      eventSource.onerror = () => {
        setConnectionStatus('disconnected')
        eventSource?.close()
        reconnectTimeout = setTimeout(() => {
          setConnectionStatus('connecting')
          connect()
        }, 5000)
      }
    }

    connect()

    return () => {
      eventSource?.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

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
      {/* Header with Follow button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Senaste händelserna
          </h2>
          <SSEStatusIndicator status={connectionStatus} />
        </div>
        <FollowCompanies />
      </div>

      {/* News items */}
      <div className="space-y-4">
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
    </div>
  )
}
