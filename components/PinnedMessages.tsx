'use client'

import { useState, useEffect } from 'react'
import { Pin, X, Loader2, ExternalLink } from 'lucide-react'
import { parseSlackMessage, formatTime } from '@/lib/slack-utils'

interface PinnedMessage {
  timestamp: string
  text: string
  userId: string | null
  pinnedAt: number
  pinnedBy: string
}

interface PinnedMessagesProps {
  channelId: string
  users: Record<string, string>
  onNavigateToMessage?: (timestamp: string) => void
  onUnpin?: (timestamp: string) => void
}

export default function PinnedMessages({
  channelId,
  users,
  onNavigateToMessage,
  onUnpin,
}: PinnedMessagesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pins, setPins] = useState<PinnedMessage[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch pins when opened
  useEffect(() => {
    if (isOpen && pins.length === 0) {
      fetchPins()
    }
  }, [isOpen])

  const fetchPins = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/slack/pins?channel=${channelId}`)
      if (res.ok) {
        const data = await res.json()
        setPins(data.pins || [])
      }
    } catch (error) {
      console.error('Error fetching pins:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnpin = async (timestamp: string) => {
    if (!confirm('Vill du ta bort denna fastnålade meddelande?')) return

    try {
      const res = await fetch('/api/slack/pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, channel: channelId }),
      })

      if (res.ok) {
        setPins(prev => prev.filter(p => p.timestamp !== timestamp))
        onUnpin?.(timestamp)
      }
    } catch (error) {
      console.error('Error unpinning:', error)
    }
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${
          isOpen
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="Fastnålade meddelanden"
      >
        <Pin className="w-4 h-4" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Fastnålade meddelanden
              </span>
              {pins.length > 0 && (
                <span className="text-xs text-gray-400">({pins.length})</span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : pins.length === 0 ? (
              <div className="py-8 text-center">
                <Pin className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  Inga fastnålade meddelanden
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Nåla fast viktiga meddelanden för snabb åtkomst
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {pins.map((pin) => {
                  const { html } = parseSlackMessage(pin.text, users)
                  const pinnedByName = users[pin.pinnedBy] || 'Okänd'

                  return (
                    <div
                      key={pin.timestamp}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <div
                        className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 prose prose-sm dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          Fastnålat av {pinnedByName} • {formatTime(String(pin.pinnedAt))}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onNavigateToMessage && (
                            <button
                              onClick={() => onNavigateToMessage(pin.timestamp)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Gå till meddelande"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleUnpin(pin.timestamp)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Ta bort fastnålning"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
