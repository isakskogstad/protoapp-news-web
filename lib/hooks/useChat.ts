'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChatMessage, ChatSettings, TypingUser } from '@/lib/slack-types'

interface UseChatOptions {
  onNewMessage?: (message: ChatMessage) => void
  soundEnabled?: boolean
}

interface UseChatReturn {
  messages: ChatMessage[]
  users: Record<string, string>
  loading: boolean
  sending: boolean
  hasMore: boolean
  loadingMore: boolean
  typingUsers: TypingUser[]
  error: string | null
  fetchMessages: (options?: { silent?: boolean; older?: boolean }) => Promise<void>
  sendMessage: (text: string, threadTs?: string) => Promise<boolean>
  addReaction: (timestamp: string, emoji: string) => Promise<void>
  removeReaction: (timestamp: string, emoji: string) => Promise<void>
  setTyping: (isTyping: boolean) => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onNewMessage, soundEnabled = true } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const previousMessageCount = useRef(0)

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return
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
  }, [soundEnabled])

  // Fetch messages
  const fetchMessages = useCallback(async (fetchOptions: {
    silent?: boolean
    older?: boolean
  } = {}) => {
    const { silent = false, older = false } = fetchOptions

    if (!silent && !older) setLoading(true)
    if (older) setLoadingMore(true)
    setError(null)

    try {
      let url = '/api/slack/messages?limit=50'

      if (older && messages.length > 0) {
        url += `&latest=${messages[0].timestamp}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      const newMessages: ChatMessage[] = data.messages || []

      setUsers(data.users || {})
      setHasMore(data.has_more || false)

      if (older) {
        setMessages(prev => [...newMessages, ...prev])
      } else {
        // Check for new messages
        if (newMessages.length > previousMessageCount.current && previousMessageCount.current > 0) {
          playSound()

          // Find truly new messages
          const lastKnownTs = messages[messages.length - 1]?.timestamp
          if (lastKnownTs) {
            const brandNew = newMessages.filter(
              m => parseFloat(m.timestamp) > parseFloat(lastKnownTs)
            )
            brandNew.forEach(m => onNewMessage?.(m))
          }
        }
        previousMessageCount.current = newMessages.length
        setMessages(newMessages)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [messages, playSound, onNewMessage])

  // Send message
  const sendMessage = useCallback(async (text: string, threadTs?: string): Promise<boolean> => {
    if (!text.trim() || sending) return false
    setSending(true)
    setError(null)

    try {
      const payload: { text: string; thread_ts?: string } = { text: text.trim() }
      if (threadTs) payload.thread_ts = threadTs

      const res = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      await fetchMessages({ silent: true })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Error sending message:', err)
      return false
    } finally {
      setSending(false)
    }
  }, [sending, fetchMessages])

  // Add reaction
  const addReaction = useCallback(async (timestamp: string, emoji: string) => {
    try {
      await fetch('/api/slack/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, emoji }),
      })
      await fetchMessages({ silent: true })
    } catch (err) {
      console.error('Error adding reaction:', err)
    }
  }, [fetchMessages])

  // Remove reaction
  const removeReaction = useCallback(async (timestamp: string, emoji: string) => {
    try {
      await fetch('/api/slack/reactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, emoji }),
      })
      await fetchMessages({ silent: true })
    } catch (err) {
      console.error('Error removing reaction:', err)
    }
  }, [fetchMessages])

  // Set typing indicator
  const setTyping = useCallback(async (isTyping: boolean) => {
    try {
      await fetch('/api/slack/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping }),
      })
    } catch {}
  }, [])

  // Load more (older messages)
  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await fetchMessages({ older: true })
    }
  }, [loadingMore, hasMore, fetchMessages])

  // Refresh
  const refresh = useCallback(async () => {
    await fetchMessages()
  }, [fetchMessages])

  // Fetch typing indicators periodically
  useEffect(() => {
    const fetchTyping = async () => {
      try {
        const res = await fetch('/api/slack/typing')
        if (res.ok) {
          const data = await res.json()
          setTypingUsers(data.typing?.map((t: { userName: string; timestamp: number }) => ({
            userId: '',
            userName: t.userName,
            timestamp: t.timestamp,
          })) || [])
        }
      } catch {}
    }

    const interval = setInterval(fetchTyping, 3000)
    return () => clearInterval(interval)
  }, [])

  return {
    messages,
    users,
    loading,
    sending,
    hasMore,
    loadingMore,
    typingUsers,
    error,
    fetchMessages,
    sendMessage,
    addReaction,
    removeReaction,
    setTyping,
    loadMore,
    refresh,
  }
}

// Settings hook
export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>({
    soundEnabled: true,
    notificationsEnabled: true,
    compactMode: false,
  })

  useEffect(() => {
    const saved = localStorage.getItem('chat-settings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem('chat-settings', JSON.stringify(updated))
      return updated
    })
  }, [])

  return { settings, updateSettings }
}
