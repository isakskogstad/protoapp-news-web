'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Lock, ChevronDown, Loader2, Search } from 'lucide-react'

interface Channel {
  id: string
  name: string
  isPrivate: boolean
  topic?: string
  purpose?: string
  memberCount?: number
}

interface ChannelSelectorProps {
  currentChannelId: string
  currentChannelName: string
  onChannelChange: (channelId: string, channelName: string) => void
}

export default function ChannelSelector({
  currentChannelId,
  currentChannelName,
  onChannelChange,
}: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch channels when opened
  useEffect(() => {
    if (isOpen && channels.length === 0) {
      fetchChannels()
    }
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [isOpen])

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/slack/channels')
      if (res.ok) {
        const data = await res.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredChannels = search
    ? channels.filter(ch =>
        ch.name.toLowerCase().includes(search.toLowerCase()) ||
        ch.topic?.toLowerCase().includes(search.toLowerCase())
      )
    : channels

  const handleSelect = (channel: Channel) => {
    onChannelChange(channel.id, channel.name)
    setIsOpen(false)
    setSearch('')

    // Save to localStorage
    localStorage.setItem('slack-channel-id', channel.id)
    localStorage.setItem('slack-channel-name', channel.name)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 py-1 transition-colors"
      >
        <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {currentChannelName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-scale-in">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök kanal..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
              />
            </div>
          </div>

          {/* Channel list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {search ? 'Inga kanaler hittades' : 'Inga kanaler tillgängliga'}
              </div>
            ) : (
              <div className="py-1">
                {filteredChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleSelect(channel)}
                    className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      channel.id === currentChannelId ? 'bg-gray-50 dark:bg-gray-700' : ''
                    }`}
                  >
                    {channel.isPrivate ? (
                      <Lock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    ) : (
                      <Hash className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {channel.name}
                        </span>
                        {channel.id === currentChannelId && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            Aktiv
                          </span>
                        )}
                      </div>
                      {(channel.topic || channel.purpose) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {channel.topic || channel.purpose}
                        </p>
                      )}
                    </div>
                    {channel.memberCount !== undefined && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {channel.memberCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
