'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Loader2, MessageSquare, Smile } from 'lucide-react'
import { parseSlackMessage, EMOJI_MAP, QUICK_REACTIONS } from '@/lib/slack-utils'
import { Block } from '@/lib/slack-types'
import BlockKitRenderer from './BlockKitRenderer'

interface ChatMessage {
  id: string
  text: string
  timestamp: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
  reactions?: Array<{
    name: string
    count: number
    users: string[]
  }>
  blocks?: Block[]
}

interface InlineEditorialChatProps {
  maxHeight?: number
}

export default function InlineEditorialChat({ maxHeight = 300 }: InlineEditorialChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Format timestamp
  const formatTime = (ts: string) => {
    const date = new Date(parseFloat(ts) * 1000)
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Fetch messages
  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/slack/messages?limit=30')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.messages || [])
      setUsers(data.users || {})
    } catch {
      // Silently fail
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Handle reaction
  const handleReact = async (timestamp: string, emoji: string) => {
    try {
      await fetch('/api/slack/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, emoji }),
      })
      await fetchMessages(true)
    } catch {
      // Silently fail
    }
    setShowEmojiPicker(null)
  }

  // Get emoji character from name
  const getEmojiChar = (name: string): string => {
    return EMOJI_MAP[name] || `:${name}:`
  }

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)

    try {
      const res = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.trim() }),
      })
      if (res.ok) {
        setInput('')
        await fetchMessages(true)
      }
    } catch {
      // Silently fail
    } finally {
      setSending(false)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages()
    const interval = setInterval(() => fetchMessages(true), 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  if (!session) {
    return (
      <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
        Logga in för att se chatten
      </div>
    )
  }

  return (
    <div className="flex flex-col">

      {/* Messages */}
      <div
        ref={scrollRef}
        className="overflow-y-auto space-y-3 mb-3 pr-1"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Inga meddelanden än</p>
          </div>
        ) : (
          messages.map((msg) => {
            const { html } = parseSlackMessage(msg.text, users)
            const hasBlocks = msg.blocks && msg.blocks.length > 0
            return (
              <div key={msg.id} className="flex gap-2 group relative">
                {/* Avatar */}
                <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
                  {msg.user.avatar ? (
                    <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(msg.user.name)
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate">{msg.user.name.split(' ')[0]}</span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  {/* Block Kit content (rich cards) or regular message */}
                  {hasBlocks ? (
                    <div className="text-xs">
                      <BlockKitRenderer blocks={msg.blocks!} users={users} />
                    </div>
                  ) : (
                    <div
                      className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words prose prose-xs dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[10px] prose-strong:font-semibold prose-em:italic"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  )}

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions.map((reaction) => (
                        <button
                          key={reaction.name}
                          onClick={() => handleReact(msg.id, reaction.name)}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-[10px] transition-colors"
                          title={reaction.users.map(id => users[id] || id).join(', ')}
                        >
                          <span>{getEmojiChar(reaction.name)}</span>
                          <span className="text-gray-500 dark:text-gray-400">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover action - add reaction */}
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                  className="absolute -top-1 right-0 p-1 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Smile className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                </button>

                {/* Quick emoji picker */}
                {showEmojiPicker === msg.id && (
                  <div className="absolute -top-8 right-0 flex gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-10">
                    {QUICK_REACTIONS.slice(0, 6).map(({ name, emoji }) => (
                      <button
                        key={name}
                        onClick={() => handleReact(msg.id, name)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-sm"
                        title={name}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Skriv..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-9 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 dark:disabled:hover:text-gray-500 transition-colors"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
