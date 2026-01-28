'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/lib/slack-types'
import ChatMessage from './ChatMessage'

interface VirtualMessageListProps {
  messages: ChatMessageType[]
  pendingMessages: ChatMessageType[]
  users: Record<string, string>
  userPresence: Record<string, string>
  pinnedTimestamps: Set<string>
  currentUserId: string
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onReact: (timestamp: string, emoji: string) => void
  onOpenThread: (message: ChatMessageType) => void
  onEdit: (message: ChatMessageType) => void
  onDelete: (timestamp: string) => void
  onRetry: (localId: string) => void
  onDeletePending: (localId: string) => void
  onPin: (timestamp: string) => void
}

export default function VirtualMessageList({
  messages,
  pendingMessages,
  users,
  userPresence,
  pinnedTimestamps,
  currentUserId,
  hasMore,
  loadingMore,
  onLoadMore,
  onReact,
  onOpenThread,
  onEdit,
  onDelete,
  onRetry,
  onDeletePending,
  onPin,
}: VirtualMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const allMessages = [...messages, ...pendingMessages]

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: allMessages.length + (hasMore ? 1 : 0), // +1 for load more button
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 72, []), // Estimated message height
    overscan: 5,
    getItemKey: (index) => {
      if (hasMore && index === 0) return 'load-more'
      const msgIndex = hasMore ? index - 1 : index
      const msg = allMessages[msgIndex]
      return msg?.localId || msg?.id || `msg-${index}`
    },
  })

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight
    }
  }, [])

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    const lastMsg = allMessages[allMessages.length - 1]
    if (lastMsg?.status === 'pending' || (!hasMore && allMessages.length > 0)) {
      scrollToBottom()
    }
  }, [allMessages.length, scrollToBottom, hasMore])

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!parentRef.current || loadingMore || !hasMore) return

    // Load more when scrolled near top
    if (parentRef.current.scrollTop < 100) {
      onLoadMore()
    }
  }, [loadingMore, hasMore, onLoadMore])

  useEffect(() => {
    const element = parentRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto p-4 bg-gradient-to-b from-gray-50/30 dark:from-gray-800/30 to-white dark:to-gray-900"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          // Load more button at top
          if (hasMore && virtualItem.index === 0) {
            return (
              <div
                key="load-more"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="flex items-center justify-center"
              >
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Ladda äldre meddelanden'
                  )}
                </button>
              </div>
            )
          }

          const msgIndex = hasMore ? virtualItem.index - 1 : virtualItem.index
          const msg = allMessages[msgIndex]

          if (!msg) return null

          const isPendingMsg = !!msg.localId

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ChatMessage
                message={msg}
                users={users}
                onReact={onReact}
                onOpenThread={onOpenThread}
                onEdit={isPendingMsg ? undefined : onEdit}
                onDelete={isPendingMsg ? undefined : onDelete}
                currentUserId={currentUserId}
                userPresence={isPendingMsg ? undefined : userPresence}
                onPin={isPendingMsg ? undefined : onPin}
                isPinned={isPendingMsg ? false : pinnedTimestamps.has(msg.id)}
                onRetry={isPendingMsg ? onRetry : undefined}
                onDeletePending={isPendingMsg ? onDeletePending : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
