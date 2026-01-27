'use client'

import { useState, useEffect, useCallback } from 'react'
import { NewsItem, ProtocolAnalysis, Kungorelse } from '@/lib/types'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import NewsCard from './NewsCard'

interface NewsFeedProps {
  initialItems: NewsItem[]
}

export default function NewsFeed({ initialItems }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
    setIsLoading(true)
    try {
      const response = await fetch(`/api/news?offset=${items.length}&limit=20`)
      const data = await response.json()

      if (data.items) {
        setItems(prev => {
          const newItems = data.items.filter(
            (item: NewsItem) => !prev.some(p => p.id === item.id)
          )
          return [...prev, ...newItems]
        })
      }
    } catch (err) {
      console.error('Load more error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [items.length])

  return (
    <div className="animate-fade-in">
      {/* News items */}
      <div className="space-y-3 stagger-children">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {/* Load more */}
      {items.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Laddar...' : 'Visa fler'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          Inga nyheter ännu
        </div>
      )}
    </div>
  )
}
