'use client'

import { useState, useEffect, useCallback, useRef, useMemo, CSSProperties, ReactElement } from 'react'
import { List, useDynamicRowHeight } from 'react-window'
import { NewsItem } from '@/lib/types'
import { showLocalNotification, isSubscribed } from '@/lib/notifications'
import NewsCard from './NewsCard'
import FollowCompanies from './FollowCompanies'
import SSEStatusIndicator from './SSEStatusIndicator'
import { NewsCardSkeleton } from './Skeleton'
import { useSupabaseRealtime, RealtimeMessage } from '@/lib/hooks/useSupabaseRealtime'
import { NewsToastContainer } from './NewsToast'
import { useToastPreferences } from '@/lib/hooks/useToastPreferences'
import { useNotificationHistory } from './NotificationHistory'

interface NewsFeedProps {
  initialItems: NewsItem[]
}

interface FollowSettings {
  enabled: boolean
  mode: 'all' | 'selected'
  selectedCompanies: { org_number: string; company_name: string }[]
}

// Estimated item heights - will be measured dynamically
const DEFAULT_ROW_HEIGHT = 200 // Default height for dynamic measurement
const ITEM_GAP = 16 // gap-4 = 16px on mobile
const ITEM_GAP_DESKTOP = 64 // gap-16 = 64px on desktop (md:space-y-16)
const OVERSCAN_COUNT = 5 // Render 5 extra items above/below viewport
// LOAD_MORE_THRESHOLD removed - using onRowsRendered instead

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

// Row props type for react-window 2.x
interface VirtualRowProps {
  items: NewsItem[]
  gap: number
  dynamicRowHeight: ReturnType<typeof useDynamicRowHeight>
}

// Row component for the virtualized list - react-window 2.x format
function VirtualRow({
  index,
  style,
  ariaAttributes,
  items,
  gap,
  dynamicRowHeight,
}: {
  index: number
  style: CSSProperties
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' }
} & VirtualRowProps): ReactElement | null {
  const rowRef = useRef<HTMLDivElement>(null)
  const item = items[index]

  // Observe element for dynamic height measurement
  useEffect(() => {
    if (rowRef.current) {
      const cleanup = dynamicRowHeight.observeRowElements([rowRef.current])
      return cleanup
    }
  }, [dynamicRowHeight])

  if (!item) return null

  // Adjust style to include gap as margin
  const adjustedStyle: CSSProperties = {
    ...style,
    paddingBottom: gap,
  }

  return (
    <div style={adjustedStyle} {...ariaAttributes} data-index={index}>
      <div ref={rowRef}>
        <NewsCard item={item} />
      </div>
    </div>
  )
}

export default function NewsFeed({ initialItems }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [toastQueue, setToastQueue] = useState<NewsItem[]>([])
  const [toastPreferences] = useToastPreferences()
  const { addNotification } = useNotificationHistory()
  const [listHeight, setListHeight] = useState(600)
  const [isDesktop, setIsDesktop] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate gap based on viewport
  const gap = isDesktop ? ITEM_GAP_DESKTOP : ITEM_GAP

  // Use dynamic row height from react-window 2.x
  // Key changes when items change to reset measurements
  const [heightKey, setHeightKey] = useState(0)
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT + gap,
    key: heightKey,
  })

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

  // Realtime message handler - memoized to prevent recreation
  const handleRealtimeMessage = useCallback((message: RealtimeMessage) => {
    if (message.operation === 'INSERT' && message.item) {
      const newItem = message.item

      setItems(prev => {
        if (prev.some(item => item.id === newItem.id)) return prev
        return [newItem, ...prev].slice(0, 100)
      })

      // Reset height measurements since items shifted (new item at top)
      setHeightKey(k => k + 1)

      // Show in-app toast notification
      setToastQueue(prev => {
        // Don't add duplicate toasts
        if (prev.some(item => item.id === newItem.id)) return prev
        // Keep max 3 in queue
        return [newItem, ...prev].slice(0, 3)
      })

      // Add to notification history
      addNotification({
        companyName: newItem.companyName,
        headline: newItem.headline || newItem.noticeText || 'Ny händelse',
        timestamp: newItem.timestamp || new Date().toISOString(),
        newsId: newItem.id,
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
    } else if (message.operation === 'UPDATE' && message.item) {
      const updatedItem = message.item

      setItems(prev => {
        return prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      })
      // Item content changed, reset measurements
      setHeightKey(k => k + 1)
    } else if (message.operation === 'DELETE') {
      const deletedId = message.oldId
      if (deletedId) {
        setItems(prev => prev.filter(item => item.id !== deletedId))
        // Reset all heights since indices changed
        setHeightKey(k => k + 1)
      }
    }
  }, [shouldNotify, addNotification])

  // Use the Supabase Realtime hook for direct subscription
  const { status: realtimeStatus } = useSupabaseRealtime({
    onMessage: handleRealtimeMessage,
    enabled: true,
  })

  // Map Realtime status to component's expected format
  const connectionStatus = useMemo((): 'connected' | 'connecting' | 'disconnected' | 'error' => {
    return realtimeStatus as 'connected' | 'connecting' | 'disconnected' | 'error'
  }, [realtimeStatus])

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

  // Handle rows rendered callback to check for infinite scroll
  const handleRowsRendered = useCallback((visibleRows: { startIndex: number; stopIndex: number }) => {
    // If we're showing the last few items, load more
    if (visibleRows.stopIndex >= items.length - 3 && hasMore && !isLoading) {
      loadMore()
    }
  }, [items.length, hasMore, isLoading, loadMore])

  // Update list height and desktop flag on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        // Calculate available height (viewport height minus top offset minus some padding)
        const availableHeight = window.innerHeight - rect.top - 20
        setListHeight(Math.max(400, availableHeight))
      }
      setIsDesktop(window.innerWidth >= 768) // md breakpoint
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Reset heights when gap changes (viewport changes between mobile/desktop)
  useEffect(() => {
    setHeightKey(k => k + 1)
  }, [gap])

  // Row props - memoized to prevent unnecessary re-renders
  const rowProps = useMemo(() => ({
    items,
    gap,
    dynamicRowHeight,
  }), [items, gap, dynamicRowHeight])

  return (
    <div className="animate-fade-in" ref={containerRef}>
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

      {/* Virtualized news items list */}
      {items.length > 0 ? (
        <List
          rowComponent={VirtualRow}
          rowCount={items.length}
          rowHeight={dynamicRowHeight}
          rowProps={rowProps}
          overscanCount={OVERSCAN_COUNT}
          onRowsRendered={handleRowsRendered}
          className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          style={{ height: listHeight, overflowX: 'hidden' }}
        />
      ) : (
        /* Empty state */
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          Inga nyheter ännu
        </div>
      )}

      {/* Loading indicator at bottom */}
      {isLoading && (
        <div className="space-y-4 mt-4">
          <NewsCardSkeleton />
          <NewsCardSkeleton />
        </div>
      )}

      {/* End of feed indicator */}
      {!isLoading && !hasMore && items.length > 0 && (
        <div className="h-20 flex items-center justify-center">
          <span className="text-sm text-gray-400">Inga fler nyheter</span>
        </div>
      )}

      {/* Toast notifications for new items */}
      <NewsToastContainer items={toastQueue} onDismiss={handleToastDismiss} preferences={toastPreferences} />
    </div>
  )
}
