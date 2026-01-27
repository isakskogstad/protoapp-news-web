'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { NewsItem, ProtocolAnalysis, Kungorelse, EventType, eventTypeConfig } from '@/lib/types'
import { protocolToNewsItem, kungorelseToNewsItem, detectEventType } from '@/lib/utils'
import NewsCard from './NewsCard'

interface NewsFeedProps {
  initialItems: NewsItem[]
}

const ALL_EVENT_TYPES: (EventType | 'all')[] = ['all', 'nyemission', 'styrelseforandring', 'vdbyte', 'konkurs', 'rekonstruktion']

export default function NewsFeed({ initialItems }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Filters
  const [activeFilter, setActiveFilter] = useState<EventType | 'all' | 'favorites'>('all')

  // Favorites (stored in localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Impact Loop counts cache
  const [impactLoopCounts, setImpactLoopCounts] = useState<Record<string, number>>({})

  // Infinite scroll ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('loopdesk_favorites')
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)))
      } catch (e) {
        console.error('Failed to parse favorites:', e)
      }
    }
  }, [])

  // Save favorites to localStorage
  const toggleFavorite = useCallback((orgNumber: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(orgNumber)) {
        next.delete(orgNumber)
      } else {
        next.add(orgNumber)
      }
      localStorage.setItem('loopdesk_favorites', JSON.stringify([...next]))
      return next
    })
  }, [])

  // Fetch Impact Loop count for a company
  const fetchImpactLoopCount = useCallback(async (companyName: string, orgNumber: string) => {
    if (impactLoopCounts[orgNumber] !== undefined) return

    try {
      const res = await fetch(`/api/impactloop?q=${encodeURIComponent(companyName)}&limit=1`)
      const data = await res.json()
      setImpactLoopCounts(prev => ({
        ...prev,
        [orgNumber]: data.totalMatches || 0
      }))
    } catch {
      // Silently fail
    }
  }, [impactLoopCounts])

  // Fetch Impact Loop counts for visible items
  useEffect(() => {
    const visibleItems = filteredItems.slice(0, 10)
    visibleItems.forEach(item => {
      fetchImpactLoopCount(item.companyName, item.orgNumber)
    })
  }, [items, activeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      eventSource = new EventSource('/api/news/stream')

      eventSource.addEventListener('connected', () => {
        setIsConnected(true)
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
        setIsConnected(false)
        eventSource?.close()
        reconnectTimeout = setTimeout(connect, 5000)
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

  // Filter items
  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'favorites') return favorites.has(item.orgNumber)
    return detectEventType(item) === activeFilter
  })

  return (
    <div className="animate-fade-in">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip
          label="Alla"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <FilterChip
          label={`Favoriter (${favorites.size})`}
          active={activeFilter === 'favorites'}
          onClick={() => setActiveFilter('favorites')}
          icon="⭐"
        />
        {ALL_EVENT_TYPES.filter(t => t !== 'all').map(type => {
          const config = eventTypeConfig[type as EventType]
          return (
            <FilterChip
              key={type}
              label={config.label}
              active={activeFilter === type}
              onClick={() => setActiveFilter(type as EventType)}
              color={config.color}
            />
          )
        })}
      </div>

      {/* News items */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <NewsCard
            key={item.id}
            item={item}
            isFavorite={favorites.has(item.orgNumber)}
            onToggleFavorite={toggleFavorite}
            impactLoopCount={impactLoopCounts[item.orgNumber]}
          />
        ))}
      </div>

      {/* Load more trigger for infinite scroll */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm">Laddar fler...</span>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <span className="text-sm text-gray-400">Inga fler nyheter</span>
        )}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          {activeFilter === 'favorites'
            ? 'Inga favoriter ännu. Klicka på stjärnan för att spara bolag.'
            : 'Inga nyheter matchar filtret'}
        </div>
      )}
    </div>
  )
}

// Filter chip component
function FilterChip({
  label,
  active,
  onClick,
  color,
  icon
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: string
  icon?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm rounded-full font-medium transition-all
        ${active
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
      `}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </button>
  )
}
