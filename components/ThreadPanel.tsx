'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/lib/slack-types'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

interface ThreadPanelProps {
  parentMessage: ChatMessageType
  users: Record<string, string>
  onClose: () => void
  onReact: (timestamp: string, emoji: string) => void
}

export default function ThreadPanel({
  parentMessage,
  users,
  onClose,
  onReact,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<ChatMessageType[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch thread replies
  const fetchReplies = async () => {
    try {
      const res = await fetch(`/api/slack/messages?thread_ts=${parentMessage.id}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        // Filter out the parent message
        const threadReplies = (data.messages || []).filter(
          (m: ChatMessageType) => m.id !== parentMessage.id
        )
        setReplies(threadReplies)
      }
    } catch (error) {
      console.error('Error fetching thread:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReplies()
  }, [parentMessage.id])

  // Scroll to bottom when replies change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [replies])

  // Send reply
  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          thread_ts: parentMessage.id,
        }),
      })

      if (res.ok) {
        await fetchReplies()
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-900 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Tråd</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {replies.length} {replies.length === 1 ? 'svar' : 'svar'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <ChatMessage
          message={parentMessage}
          users={users}
          onReact={onReact}
          onOpenThread={() => {}}
          isThreadView={true}
        />
      </div>

      {/* Replies */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-400 dark:text-gray-500 animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
            Inga svar ännu
          </div>
        ) : (
          replies.map((reply) => (
            <ChatMessage
              key={reply.id}
              message={reply}
              users={users}
              onReact={onReact}
              onOpenThread={() => {}}
              isThreadView={true}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <ChatInput
          users={users}
          onSend={handleSend}
          sending={sending}
          placeholder="Svara i tråden..."
        />
      </div>
    </div>
  )
}
