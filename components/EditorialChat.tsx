'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  ChevronDown,
  Loader2,
  Settings,
  Volume2,
  VolumeX,
  ArrowDown,
  RefreshCw,
} from 'lucide-react'
import { ChatMessage as ChatMessageType, ChatSettings, MessageStatus } from '@/lib/slack-types'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ThreadPanel from './ThreadPanel'
import TypingIndicator from './TypingIndicator'
import ChannelSelector from './ChannelSelector'
import PinnedMessages from './PinnedMessages'

const DEFAULT_CHANNEL_ID = process.env.NEXT_PUBLIC_SLACK_CHANNEL_ID || ''
const DEFAULT_CHANNEL_NAME = 'redaktion-general'

const DEFAULT_SETTINGS: ChatSettings = {
  soundEnabled: true,
  notificationsEnabled: true,
  compactMode: false,
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch {}
}

export default function EditorialChat() {
  const { data: session } = useSession()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [typingUsers, setTypingUsers] = useState<Array<{ userName: string }>>([])
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const [activeThread, setActiveThread] = useState<ChatMessageType | null>(null)
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [pendingMessages, setPendingMessages] = useState<ChatMessageType[]>([])
  const [editingMessage, setEditingMessage] = useState<ChatMessageType | null>(null)
  const [currentChannelId, setCurrentChannelId] = useState(DEFAULT_CHANNEL_ID)
  const [currentChannelName, setCurrentChannelName] = useState(DEFAULT_CHANNEL_NAME)
  const [userPresence, setUserPresence] = useState<Record<string, string>>({})
  const [pinnedTimestamps, setPinnedTimestamps] = useState<Set<string>>(new Set())

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastReadTimestamp = useRef<string | null>(null)
  const previousMessageCount = useRef(0)
  const isAtBottom = useRef(true)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Load settings and channel
  useEffect(() => {
    const saved = localStorage.getItem('chat-settings')
    if (saved) {
      try { setSettings(JSON.parse(saved)) } catch {}
    }

    // Load saved channel
    const savedChannelId = localStorage.getItem('slack-channel-id')
    const savedChannelName = localStorage.getItem('slack-channel-name')
    if (savedChannelId && savedChannelName) {
      setCurrentChannelId(savedChannelId)
      setCurrentChannelName(savedChannelName)
    }
  }, [])

  // Handle channel change
  const handleChannelChange = (channelId: string, channelName: string) => {
    setCurrentChannelId(channelId)
    setCurrentChannelName(channelName)
    setMessages([])
    setPendingMessages([])
    setActiveThread(null)
    // Fetch messages for new channel
    fetchMessagesForChannel(channelId)
  }

  // Fetch messages for specific channel
  const fetchMessagesForChannel = async (channelId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/slack/messages?limit=50&channel=${channelId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.messages || [])
      setUsers(data.users || {})
      setHasMore(data.has_more || false)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = (newSettings: Partial<ChatSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem('chat-settings', JSON.stringify(updated))
  }

  const checkIfAtBottom = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50
    }
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
      setShowNewMessageButton(false)
    }
  }, [])

  // Fetch messages
  const fetchMessages = useCallback(async (options: {
    silent?: boolean
    older?: boolean
  } = {}) => {
    const { silent = false, older = false } = options

    if (!silent && !older) setLoading(true)
    if (older) setLoadingMore(true)

    try {
      let url = `/api/slack/messages?limit=50&channel=${currentChannelId}`

      if (older && messages.length > 0) {
        url += `&latest=${messages[0].timestamp}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error()

      const data = await res.json()
      const newMessages = data.messages || []

      setUsers(data.users || {})
      setHasMore(data.has_more || false)

      if (older) {
        setMessages(prev => [...newMessages, ...prev])
      } else {
        if (newMessages.length > previousMessageCount.current &&
            previousMessageCount.current > 0 &&
            !isOpen &&
            settings.soundEnabled) {
          playNotificationSound()
        }
        previousMessageCount.current = newMessages.length

        setMessages(newMessages)

        if (!isOpen && lastReadTimestamp.current && newMessages.length > 0) {
          const unread = newMessages.filter(
            (m: ChatMessageType) => parseFloat(m.timestamp) > parseFloat(lastReadTimestamp.current!)
          )
          setUnreadCount(unread.length)
        }

        // Show new message button if not at bottom
        if (isOpen && !isAtBottom.current && newMessages.length > messages.length) {
          setShowNewMessageButton(true)
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [isOpen, messages, settings.soundEnabled])

  // Send message with optimistic UI
  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return

    const localId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const userName = session?.user?.name || session?.user?.email || 'Anonym'

    // Create optimistic message
    const pendingMsg: ChatMessageType = {
      id: localId,
      localId,
      text: text.trim(),
      status: 'pending',
      timestamp: String(Date.now() / 1000),
      user: {
        id: session?.user?.email || 'unknown',
        name: userName,
        avatar: session?.user?.image || null,
      },
      reactions: [],
    }

    // Add to pending messages immediately
    setPendingMessages(prev => [...prev, pendingMsg])
    scrollToBottom()

    setSending(true)

    try {
      const res = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })

      if (res.ok) {
        // Remove pending message and fetch real messages
        setPendingMessages(prev => prev.filter(m => m.localId !== localId))
        await fetchMessages({ silent: true })
        scrollToBottom()
      } else {
        // Mark as failed
        setPendingMessages(prev => prev.map(m =>
          m.localId === localId ? { ...m, status: 'failed' as MessageStatus } : m
        ))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Mark as failed
      setPendingMessages(prev => prev.map(m =>
        m.localId === localId ? { ...m, status: 'failed' as MessageStatus } : m
      ))
    } finally {
      setSending(false)
    }
  }

  // Retry failed message
  const handleRetry = async (localId: string) => {
    const failedMsg = pendingMessages.find(m => m.localId === localId)
    if (!failedMsg) return

    // Reset status to pending
    setPendingMessages(prev => prev.map(m =>
      m.localId === localId ? { ...m, status: 'pending' as MessageStatus } : m
    ))

    try {
      const res = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: failedMsg.text }),
      })

      if (res.ok) {
        setPendingMessages(prev => prev.filter(m => m.localId !== localId))
        await fetchMessages({ silent: true })
      } else {
        setPendingMessages(prev => prev.map(m =>
          m.localId === localId ? { ...m, status: 'failed' as MessageStatus } : m
        ))
      }
    } catch {
      setPendingMessages(prev => prev.map(m =>
        m.localId === localId ? { ...m, status: 'failed' as MessageStatus } : m
      ))
    }
  }

  // Delete pending message
  const handleDeletePending = (localId: string) => {
    setPendingMessages(prev => prev.filter(m => m.localId !== localId))
  }

  // Edit message
  const handleEdit = async (timestamp: string, newText: string) => {
    try {
      const res = await fetch('/api/slack/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, text: newText }),
      })

      if (res.ok) {
        setEditingMessage(null)
        await fetchMessages({ silent: true })
      }
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  // Delete message
  const handleDelete = async (timestamp: string) => {
    if (!confirm('Vill du ta bort detta meddelande?')) return

    try {
      const res = await fetch('/api/slack/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp }),
      })

      if (res.ok) {
        await fetchMessages({ silent: true })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  // Handle reaction
  const handleReact = async (timestamp: string, emoji: string) => {
    try {
      await fetch('/api/slack/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, emoji }),
      })
      await fetchMessages({ silent: true })
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  // Handle typing indicator
  const handleTyping = async (isTyping: boolean) => {
    try {
      await fetch('/api/slack/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping }),
      })
    } catch {}
  }

  // Fetch typing indicators
  const fetchTyping = async () => {
    try {
      const res = await fetch('/api/slack/typing')
      if (res.ok) {
        const data = await res.json()
        setTypingUsers(data.typing || [])
      }
    } catch {}
  }

  // Fetch user presence
  const fetchPresence = useCallback(async () => {
    // Get unique user IDs from messages
    const userIds = Array.from(new Set(messages.map(m => m.user.id).filter(Boolean)))
    if (userIds.length === 0) return

    try {
      const res = await fetch(`/api/slack/presence?users=${userIds.join(',')}`)
      if (res.ok) {
        const data = await res.json()
        setUserPresence(data.presence || {})
      }
    } catch (error) {
      console.error('Error fetching presence:', error)
    }
  }, [messages])

  // Fetch pinned messages
  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch(`/api/slack/pins?channel=${currentChannelId}`)
      if (res.ok) {
        const data = await res.json()
        const timestamps = new Set<string>(data.pins?.map((p: { timestamp: string }) => p.timestamp) || [])
        setPinnedTimestamps(timestamps)
      }
    } catch (error) {
      console.error('Error fetching pins:', error)
    }
  }, [currentChannelId])

  // Handle pin/unpin
  const handlePin = async (timestamp: string) => {
    const isPinned = pinnedTimestamps.has(timestamp)

    try {
      const res = await fetch('/api/slack/pins', {
        method: isPinned ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, channel: currentChannelId }),
      })

      if (res.ok) {
        setPinnedTimestamps(prev => {
          const newSet = new Set(prev)
          if (isPinned) {
            newSet.delete(timestamp)
          } else {
            newSet.add(timestamp)
          }
          return newSet
        })
      }
    } catch (error) {
      console.error('Error pinning/unpinning:', error)
    }
  }

  // Load more (older messages)
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchMessages({ older: true })
    }
  }

  // Handle scroll
  const handleScroll = () => {
    checkIfAtBottom()

    // Load more when scrolled to top
    if (scrollRef.current && scrollRef.current.scrollTop < 50 && hasMore && !loadingMore) {
      loadMore()
    }
  }

  // Setup SSE connection
  useEffect(() => {
    if (!isOpen || !session) return

    const setupSSE = () => {
      eventSourceRef.current = new EventSource('/api/slack/stream')

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'messages' && data.messages?.length > 0) {
            fetchMessages({ silent: true })
          }

          if (data.type === 'typing') {
            setTypingUsers(data.users || [])
          }
        } catch {}
      }

      eventSourceRef.current.onerror = () => {
        eventSourceRef.current?.close()
        // Reconnect after 5 seconds
        setTimeout(setupSSE, 5000)
      }
    }

    setupSSE()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [isOpen, session, fetchMessages])

  // Scroll to bottom on new messages when at bottom
  useEffect(() => {
    if (isOpen && isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  // Initial load and mark as read
  useEffect(() => {
    if (isOpen) {
      fetchMessages()
      if (messages.length > 0) {
        lastReadTimestamp.current = messages[messages.length - 1].timestamp
      }
      setUnreadCount(0)
    }
  }, [isOpen])

  // Polling fallback
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchMessages({ silent: true })
      if (isOpen) fetchTyping()
    }, isOpen ? 5000 : 30000)

    fetchMessages({ silent: true })
    return () => clearInterval(pollInterval)
  }, [fetchMessages, isOpen])

  // Fetch presence periodically when open
  useEffect(() => {
    if (!isOpen || messages.length === 0) return

    // Initial fetch
    fetchPresence()

    // Poll every 60 seconds
    const presenceInterval = setInterval(fetchPresence, 60000)

    return () => clearInterval(presenceInterval)
  }, [isOpen, fetchPresence, messages.length])

  // Fetch pins when channel changes
  useEffect(() => {
    if (isOpen && currentChannelId) {
      fetchPins()
    }
  }, [isOpen, currentChannelId, fetchPins])

  // Mark as read
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      lastReadTimestamp.current = messages[messages.length - 1].timestamp
      setUnreadCount(0)
    }
  }, [isOpen, messages])

  if (!session) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 dark:from-gray-800 to-white dark:to-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChannelSelector
                currentChannelId={currentChannelId}
                currentChannelName={currentChannelName}
                onChannelChange={handleChannelChange}
              />
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <PinnedMessages
                channelId={currentChannelId}
                users={users}
                onUnpin={(ts) => setPinnedTimestamps(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(ts)
                  return newSet
                })}
              />
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchMessages()}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 ml-1">{messages.length}</span>
            </div>
          </div>

          {/* Settings dropdown */}
          {showSettings && (
            <div className="absolute top-14 right-4 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50">
              <button
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span>Ljud {settings.soundEnabled ? 'på' : 'av'}</span>
              </button>
            </div>
          )}

          {/* Messages container */}
          <div className="relative h-96">
            {/* Thread panel overlay */}
            {activeThread && (
              <ThreadPanel
                parentMessage={activeThread}
                users={users}
                onClose={() => setActiveThread(null)}
                onReact={handleReact}
              />
            )}

            {/* Main message list */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-gray-50/30 dark:from-gray-800/30 to-white dark:to-gray-900"
            >
              {/* Load more button */}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Ladda äldre meddelanden'
                  )}
                </button>
              )}

              {loading && messages.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
                </div>
              ) : messages.length === 0 && pendingMessages.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
                  Inga meddelanden än
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      users={users}
                      onReact={handleReact}
                      onOpenThread={setActiveThread}
                      onEdit={setEditingMessage}
                      onDelete={handleDelete}
                      currentUserId={session?.user?.email || ''}
                      userPresence={userPresence}
                      onPin={handlePin}
                      isPinned={pinnedTimestamps.has(msg.id)}
                    />
                  ))}
                  {/* Pending messages */}
                  {pendingMessages.map((msg) => (
                    <ChatMessage
                      key={msg.localId}
                      message={msg}
                      users={users}
                      onReact={handleReact}
                      onOpenThread={setActiveThread}
                      onRetry={handleRetry}
                      onDeletePending={handleDeletePending}
                      currentUserId={session?.user?.email || ''}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pt-4">
                <TypingIndicator users={typingUsers} />
              </div>
            )}

            {/* New message button */}
            {showNewMessageButton && (
              <button
                onClick={() => scrollToBottom()}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors animate-bounce-in"
              >
                <ArrowDown className="w-3 h-3" />
                Nya meddelanden
              </button>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <ChatInput
              users={users}
              onSend={editingMessage ? (text) => handleEdit(editingMessage.id, text) : handleSend}
              onTyping={handleTyping}
              sending={sending}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
            />
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setShowSettings(false)
        }}
        className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rotate-0'
            : 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-105'
        }`}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        ) : (
          <>
            <svg className="w-6 h-6 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}
