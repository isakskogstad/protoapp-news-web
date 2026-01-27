'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Loader2, Hash, MessageSquare } from 'lucide-react'

interface ChatMessage {
  id: string
  text: string
  timestamp: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
}

interface InlineEditorialChatProps {
  maxHeight?: number
}

export default function InlineEditorialChat({ maxHeight = 300 }: InlineEditorialChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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
    } catch {
      // Silently fail
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

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
      <div className="text-center py-6 text-sm text-gray-400">
        Logga in för att se chatten
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Channel header */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
        <Hash className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-600">redaktion-general</span>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />
        <span className="text-[10px] font-mono text-gray-400">{messages.length}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="overflow-y-auto space-y-3 mb-3 pr-1"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Inga meddelanden än</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2 group">
              {/* Avatar */}
              <div className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0 overflow-hidden">
                {msg.user.avatar ? (
                  <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(msg.user.name)
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[11px] font-semibold text-gray-900 truncate">{msg.user.name.split(' ')[0]}</span>
                  <span className="text-[9px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-gray-700 leading-relaxed break-words">
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Skriv..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-9 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black/10 focus:border-gray-300 transition-all placeholder:text-gray-400"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
