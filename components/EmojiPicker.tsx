'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile, Search, X } from 'lucide-react'
import { EMOJI_CATEGORIES, searchEmojis, EMOJI_MAP } from '@/lib/slack-utils'

interface EmojiPickerProps {
  onSelect: (emoji: string, name: string) => void
  onClose: () => void
  position?: 'top' | 'bottom'
}

export default function EmojiPicker({ onSelect, onClose, position = 'top' }: EmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Vanliga')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const searchResults = search ? searchEmojis(search) : null

  const handleEmojiClick = (emoji: string) => {
    // Find emoji name from EMOJI_MAP
    const name = Object.entries(EMOJI_MAP).find(([_, e]) => e === emoji)?.[0] || emoji
    onSelect(emoji, name)
  }

  return (
    <div
      ref={ref}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-scale-in`}
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök emoji..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 overflow-x-auto scrollbar-hide">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto">
        {searchResults ? (
          searchResults.length > 0 ? (
            <div className="grid grid-cols-8 gap-1">
              {searchResults.map(({ name, emoji }) => (
                <button
                  key={name}
                  onClick={() => onSelect(emoji, name)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title={`:${name}:`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Inga emojis hittades</p>
          )
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Quick reaction bar for messages
interface QuickReactionsProps {
  onReact: (emoji: string, name: string) => void
  onOpenFull: () => void
}

export function QuickReactions({ onReact, onOpenFull }: QuickReactionsProps) {
  const quickEmojis = [
    { emoji: '👍', name: 'thumbsup' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '😂', name: 'joy' },
    { emoji: '🔥', name: 'fire' },
    { emoji: '👀', name: 'eyes' },
    { emoji: '✅', name: 'white_check_mark' },
  ]

  return (
    <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
      {quickEmojis.map(({ emoji, name }) => (
        <button
          key={name}
          onClick={() => onReact(emoji, name)}
          className="w-7 h-7 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          {emoji}
        </button>
      ))}
      <button
        onClick={onOpenFull}
        className="w-7 h-7 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      >
        <Smile className="w-4 h-4" />
      </button>
    </div>
  )
}
