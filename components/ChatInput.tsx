'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Smile } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import MentionAutocomplete from './MentionAutocomplete'

interface ChatInputProps {
  users: Record<string, string>
  onSend: (text: string) => void
  onTyping?: (isTyping: boolean) => void
  sending?: boolean
  placeholder?: string
  disabled?: boolean
}

export default function ChatInput({
  users,
  onSend,
  onTyping,
  sending = false,
  placeholder = 'Skriv ett meddelande...',
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 3000)
    }
  }, [onTyping])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setInput(value)
    handleTyping()

    // Check for @mention
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setMentionStartIndex(cursorPos - mentionMatch[0].length)
    } else {
      setMentionQuery(null)
    }
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = inputRef.current?.selectionStart || input.length
    const newValue = input.slice(0, cursorPos) + emoji + input.slice(cursorPos)
    setInput(newValue)
    setShowEmojiPicker(false)

    // Focus and move cursor
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length)
    }, 0)
  }

  // Handle mention selection
  const handleMentionSelect = (userId: string, userName: string) => {
    if (mentionQuery !== null) {
      const before = input.slice(0, mentionStartIndex)
      const after = input.slice(mentionStartIndex + mentionQuery.length + 1) // +1 for @
      const newValue = `${before}<@${userId}> ${after}`
      setInput(newValue)
      setMentionQuery(null)

      // Focus input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

  // Handle send
  const handleSend = () => {
    if (!input.trim() || sending || disabled) return
    onSend(input.trim())
    setInput('')
    if (onTyping) onTyping(false)
  }

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      setShowEmojiPicker(false)
      setMentionQuery(null)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      {/* Mention autocomplete */}
      {mentionQuery !== null && (
        <MentionAutocomplete
          query={mentionQuery}
          users={users}
          onSelect={handleMentionSelect}
          onClose={() => setMentionQuery(null)}
        />
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-0 mb-2">
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            position="top"
          />
        </div>
      )}

      {/* Input field */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={sending || disabled}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-20 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Lägg till emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim() || disabled}
              className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 text-right">
        <span className="opacity-0 group-focus-within:opacity-100 transition-opacity">
          Enter för att skicka • @ för att nämna
        </span>
      </div>
    </div>
  )
}
