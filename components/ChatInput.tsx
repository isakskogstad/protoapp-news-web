'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Smile, X, Pencil, Paperclip } from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import MentionAutocomplete from './MentionAutocomplete'
import FilePreview from './FilePreview'
import { ChatMessage as ChatMessageType } from '@/lib/slack-types'

interface ChatInputProps {
  users: Record<string, string>
  onSend: (text: string) => void
  onTyping?: (isTyping: boolean) => void
  sending?: boolean
  placeholder?: string
  disabled?: boolean
  // Edit mode
  editingMessage?: ChatMessageType | null
  onCancelEdit?: () => void
  // File upload
  onFileUploaded?: () => void
}

export default function ChatInput({
  users,
  onSend,
  onTyping,
  sending = false,
  placeholder = 'Skriv ett meddelande...',
  disabled = false,
  editingMessage,
  onCancelEdit,
  onFileUploaded,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set input when editing a message
  useEffect(() => {
    if (editingMessage) {
      setInput(editingMessage.text)
      inputRef.current?.focus()
    } else {
      setInput('')
    }
  }, [editingMessage])

  // Handle file selection
  const handleFileSelect = (files: File[]) => {
    if (files.length > 0 && !editingMessage) {
      setPendingFile(files[0])
    }
  }

  // Upload file
  const uploadFile = async () => {
    if (!pendingFile || uploading) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      if (input.trim()) {
        formData.append('comment', input.trim())
      }

      const res = await fetch('/api/slack/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setPendingFile(null)
        setInput('')
        onFileUploaded?.()
      } else {
        const error = await res.json()
        console.error('Upload failed:', error)
        alert('Kunde inte ladda upp filen')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Kunde inte ladda upp filen')
    } finally {
      setUploading(false)
    }
  }

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editingMessage) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (editingMessage) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

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
  const handleMentionSelect = (userId: string, _userName: string) => {
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
    // If there's a pending file, upload it
    if (pendingFile) {
      uploadFile()
      return
    }

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
      // Cancel edit mode on Escape
      if (editingMessage && onCancelEdit) {
        onCancelEdit()
      }
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
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            handleFileSelect(Array.from(files))
          }
          e.target.value = ''
        }}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-lg z-10 flex items-center justify-center">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            Släpp filen här
          </p>
        </div>
      )}

      {/* Edit mode banner */}
      {editingMessage && (
        <div className="absolute bottom-full left-0 right-0 mb-2 flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Pencil className="w-4 h-4" />
            <span>Redigerar meddelande</span>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="mb-2">
          <FilePreview
            file={pendingFile}
            onRemove={() => setPendingFile(null)}
            uploading={uploading}
          />
        </div>
      )}

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
            {/* File attachment button */}
            {!editingMessage && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                title="Bifoga fil"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}

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
              disabled={(sending || uploading) || (!input.trim() && !pendingFile) || disabled}
              className={`p-1.5 transition-colors ${
                editingMessage
                  ? 'text-blue-500 hover:text-blue-600 disabled:opacity-40'
                  : pendingFile
                  ? 'text-green-500 hover:text-green-600 disabled:opacity-40'
                  : 'text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-40 disabled:hover:text-gray-400'
              }`}
            >
              {sending || uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingMessage ? (
                <span className="text-xs font-medium">Spara</span>
              ) : pendingFile ? (
                <span className="text-xs font-medium">Ladda upp</span>
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
          {editingMessage ? 'Enter för att spara • Esc för att avbryta' : 'Enter för att skicka • @ för att nämna'}
        </span>
      </div>
    </div>
  )
}
