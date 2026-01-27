'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Loader2, Hash, ChevronDown } from 'lucide-react'

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

export default function EditorialChat() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastReadTimestamp = useRef<string | null>(null)
  const previousMessageCount = useRef(0)

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
      const res = await fetch('/api/slack/messages?limit=50')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const newMessages = data.messages || []

      // Play sound if new messages (not initial load)
      if (newMessages.length > previousMessageCount.current && previousMessageCount.current > 0 && !isOpen) {
        // Simple beep
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
      previousMessageCount.current = newMessages.length

      setMessages(newMessages)

      // Update unread count
      if (!isOpen && lastReadTimestamp.current && newMessages.length > 0) {
        const unread = newMessages.filter(
          (m: ChatMessage) => parseFloat(m.timestamp) > parseFloat(lastReadTimestamp.current!)
        )
        setUnreadCount(unread.length)
      }
    } catch {
      // Silently fail
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isOpen])

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

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  // Load messages when opening
  useEffect(() => {
    if (isOpen) {
      fetchMessages()
      if (messages.length > 0) {
        lastReadTimestamp.current = messages[messages.length - 1].timestamp
      }
      setUnreadCount(0)
    }
  }, [isOpen, fetchMessages])

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(true), isOpen ? 3000 : 15000)
    fetchMessages(true)
    return () => clearInterval(interval)
  }, [fetchMessages, isOpen])

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
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">redaktion-general</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />
            <span className="text-[10px] font-mono text-gray-400">{messages.length}</span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                Inga meddelanden än
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-2.5 group">
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-md bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0 overflow-hidden">
                    {msg.user.avatar ? (
                      <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(msg.user.name)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900 truncate">{msg.user.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed break-words">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Skriv ett meddelande..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10 focus:border-gray-300 transition-all placeholder:text-gray-400"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-black disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-gray-100 hover:bg-gray-200'
            : 'bg-black hover:bg-gray-800 hover:scale-105'
        }`}
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        ) : (
          <>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}
