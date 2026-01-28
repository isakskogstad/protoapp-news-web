'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Loader2, MessageSquare, Smile, Paperclip, X, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react'
import { parseSlackMessage, EMOJI_MAP, QUICK_REACTIONS } from '@/lib/slack-utils'
import { Block, Attachment } from '@/lib/slack-types'
import BlockKitRenderer from './BlockKitRenderer'

interface ChatFile {
  id: string
  name: string
  mimetype: string
  url_private?: string
  thumb_360?: string
  thumb_480?: string
  thumb_720?: string
}

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
  attachments?: Attachment[]
  files?: ChatFile[]
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
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      // Fetch messages and typing status in parallel
      const [messagesRes, typingRes] = await Promise.all([
        fetch('/api/slack/messages?limit=30'),
        fetch('/api/slack/typing'),
      ])

      if (messagesRes.ok) {
        const data = await messagesRes.json()
        setMessages(data.messages || [])
        setUsers(data.users || {})
      }

      if (typingRes.ok) {
        const typingData = await typingRes.json()
        setTypingUsers(typingData.typingUsers || [])
      }
    } catch {
      // Silently fail
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Handle typing indicator
  const handleTyping = useCallback(async () => {
    if (!isTyping) {
      setIsTyping(true)
      try {
        await fetch('/api/slack/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      } catch {
        // Silently fail
      }
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }, [isTyping])

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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 5)) // Max 5 files
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Upload file
  const uploadFile = async (file: File, comment?: string): Promise<boolean> => {
    const formData = new FormData()
    formData.append('file', file)
    if (comment) {
      formData.append('comment', comment)
    }

    try {
      const res = await fetch('/api/slack/upload', {
        method: 'POST',
        body: formData,
      })
      return res.ok
    } catch {
      return false
    }
  }

  // Send message
  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || sending) return
    setSending(true)
    setUploadingFiles(selectedFiles.length > 0)

    try {
      // Upload files first if any
      if (selectedFiles.length > 0) {
        const comment = input.trim() || undefined
        for (let i = 0; i < selectedFiles.length; i++) {
          // Only add comment to first file
          await uploadFile(selectedFiles[i], i === 0 ? comment : undefined)
        }
        setSelectedFiles([])
      } else {
        // Just send text message
        const res = await fetch('/api/slack/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.trim() }),
        })
        if (res.ok) {
          setInput('')
        }
      }

      setInput('')
      await fetchMessages(true)
    } catch {
      // Silently fail
    } finally {
      setSending(false)
      setUploadingFiles(false)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    handleTyping()
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
    const interval = setInterval(() => fetchMessages(true), 3000) // Faster polling for typing
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  if (!session) {
    return (
      <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
        Logga in för att se chatten
      </div>
    )
  }

  // Get file icon based on mimetype
  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  // Render file attachments
  const renderFiles = (files: ChatFile[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {files.map((file) => {
          const isImage = file.mimetype?.startsWith('image/')
          const thumbUrl = file.thumb_720 || file.thumb_480 || file.thumb_360

          if (isImage && thumbUrl) {
            return (
              <a
                key={file.id}
                href={file.url_private}
                target="_blank"
                rel="noopener noreferrer"
                className="block max-w-[200px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors"
              >
                <img
                  src={thumbUrl}
                  alt={file.name}
                  className="w-full h-auto"
                />
              </a>
            )
          }

          return (
            <a
              key={file.id}
              href={file.url_private}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors text-xs"
            >
              {getFileIcon(file.mimetype)}
              <span className="truncate max-w-[120px]">{file.name}</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          )
        })}
      </div>
    )
  }

  // Render link preview (attachment)
  const renderAttachment = (attachment: Attachment, index: number) => {
    const borderColor = attachment.color ? `#${attachment.color}` : '#e5e7eb'

    return (
      <div
        key={index}
        className="mt-2 border-l-2 pl-3 py-1"
        style={{ borderLeftColor: borderColor }}
      >
        {/* Author */}
        {attachment.author_name && (
          <div className="flex items-center gap-1.5 mb-1">
            {attachment.author_icon && (
              <img src={attachment.author_icon} alt="" className="w-4 h-4 rounded" />
            )}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {attachment.author_link ? (
                <a href={attachment.author_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {attachment.author_name}
                </a>
              ) : attachment.author_name}
            </span>
          </div>
        )}

        {/* Title with link */}
        {attachment.title && (
          <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {attachment.title_link ? (
              <a href={attachment.title_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {attachment.title}
              </a>
            ) : attachment.title}
          </h4>
        )}

        {/* Text/description */}
        {attachment.text && (
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {attachment.text}
          </p>
        )}

        {/* Image preview */}
        {attachment.image_url && (
          <img
            src={attachment.image_url}
            alt=""
            className="mt-2 max-w-full max-h-32 rounded border border-gray-200 dark:border-gray-700"
          />
        )}

        {/* Thumb */}
        {attachment.thumb_url && !attachment.image_url && (
          <img
            src={attachment.thumb_url}
            alt=""
            className="mt-2 w-16 h-16 rounded object-cover border border-gray-200 dark:border-gray-700"
          />
        )}

        {/* Footer */}
        {attachment.footer && (
          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-400">
            {attachment.footer_icon && (
              <img src={attachment.footer_icon} alt="" className="w-3 h-3 rounded" />
            )}
            <span>{attachment.footer}</span>
          </div>
        )}
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
            // Only use BlockKitRenderer for actual Block Kit messages (not rich_text which is just regular messages)
            const hasRenderableBlocks = msg.blocks && msg.blocks.length > 0 &&
              msg.blocks.some(b => ['section', 'context', 'actions', 'header', 'divider', 'image'].includes(b.type))
            const hasAttachments = msg.attachments && msg.attachments.length > 0
            const hasFiles = msg.files && msg.files.length > 0

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
                  {hasRenderableBlocks ? (
                    <div className="text-xs">
                      <BlockKitRenderer blocks={msg.blocks!} attachments={msg.attachments} users={users} />
                    </div>
                  ) : (
                    <>
                      {msg.text && (
                        <div
                          className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words prose prose-xs dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[10px] prose-strong:font-semibold prose-em:italic"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      )}
                      {/* Link previews (attachments) */}
                      {hasAttachments && msg.attachments!.map((att, i) => renderAttachment(att, i))}
                    </>
                  )}

                  {/* File attachments */}
                  {hasFiles && renderFiles(msg.files!)}

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

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUsers.join(', ')} skriver...</span>
          </div>
        )}
      </div>

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100 dark:border-gray-800 mb-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="relative group/file flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="truncate max-w-[80px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="relative flex items-center gap-2">
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
            title="Bifoga fil"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={selectedFiles.length > 0 ? "Lägg till meddelande..." : "Skriv..."}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-9 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!input.trim() && selectedFiles.length === 0)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 dark:disabled:hover:text-gray-500 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Upload progress */}
        {uploadingFiles && (
          <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Laddar upp filer...
          </div>
        )}
      </div>
    </div>
  )
}
