'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Loader2, MessageSquare, Smile, Paperclip, X, Image as ImageIcon, FileText, ExternalLink, Pin, MessageCircle, ChevronDown, ChevronRight, Video } from 'lucide-react'
import { EMOJI_MAP, QUICK_REACTIONS } from '@/lib/slack-utils'
import { parseSlackMrkdwn } from '@/lib/slack-mrkdwn'
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
  threadTs?: string
  replyCount?: number
  isThreadParent?: boolean
  isThreadReply?: boolean
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

interface PinnedMessage {
  timestamp: string
  text: string
  userId: string | null
  pinnedAt: number
  pinnedBy: string
}

interface InlineEditorialChatProps {
  maxHeight?: number | string
}

// Quick reaction emojis for inline buttons
const INLINE_REACTIONS = [
  { name: 'thumbsup', emoji: '👍' },
  { name: 'thumbsdown', emoji: '👎' },
  { name: 'fire', emoji: '🔥' },
  { name: 'eyes', emoji: '👀' },
]

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
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [showPinned, setShowPinned] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [threadReplies, setThreadReplies] = useState<Record<string, ChatMessage[]>>({})
  const [loadingThreads, setLoadingThreads] = useState<Set<string>>(new Set())
  const [userPresence, setUserPresence] = useState<Record<string, string>>({})
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
      const [messagesRes, typingRes, pinsRes] = await Promise.all([
        fetch('/api/slack/messages?limit=30'),
        fetch('/api/slack/typing'),
        fetch('/api/slack/pins'),
      ])

      if (messagesRes.ok) {
        const data = await messagesRes.json()
        setMessages(data.messages || [])
        setUsers(data.users || {})

        // Fetch presence for all unique users
        const allUserIds = (data.messages || []).map((m: ChatMessage) => m.user.id).filter(Boolean)
        const userIds = Array.from(new Set(allUserIds)) as string[]
        if (userIds.length > 0) {
          fetchPresence(userIds)
        }
      }

      if (typingRes.ok) {
        const typingData = await typingRes.json()
        setTypingUsers(typingData.typingUsers || [])
      }

      if (pinsRes.ok) {
        const pinsData = await pinsRes.json()
        setPinnedMessages(pinsData.pins || [])
      }
    } catch {
      // Silently fail
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Fetch presence for users
  const fetchPresence = async (userIds: string[]) => {
    try {
      const res = await fetch(`/api/slack/presence?users=${userIds.join(',')}`)
      if (res.ok) {
        const data = await res.json()
        setUserPresence(data.presence || {})
      }
    } catch {
      // Silently fail
    }
  }

  // Fetch thread replies
  const fetchThreadReplies = async (threadTs: string) => {
    if (loadingThreads.has(threadTs)) return

    setLoadingThreads(prev => new Set([...Array.from(prev), threadTs]))

    try {
      const res = await fetch(`/api/slack/messages?thread_ts=${threadTs}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        // First message is the parent, rest are replies
        const replies = (data.messages || []).slice(1)
        setThreadReplies(prev => ({ ...prev, [threadTs]: replies }))
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingThreads(prev => {
        const next = new Set(prev)
        next.delete(threadTs)
        return next
      })
    }
  }

  // Toggle thread expansion
  const toggleThread = (threadTs: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev)
      if (next.has(threadTs)) {
        next.delete(threadTs)
      } else {
        next.add(threadTs)
        // Fetch replies if not already loaded
        if (!threadReplies[threadTs]) {
          fetchThreadReplies(threadTs)
        }
      }
      return next
    })
  }

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

  // Handle pin/unpin
  const handlePin = async (timestamp: string, isPinned: boolean) => {
    try {
      await fetch('/api/slack/pins', {
        method: isPinned ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp }),
      })
      await fetchMessages(true)
    } catch {
      // Silently fail
    }
  }

  // Check if message is pinned
  const isMessagePinned = (timestamp: string) => {
    return pinnedMessages.some(p => p.timestamp === timestamp)
  }

  // Get emoji character from name
  const getEmojiChar = (name: string): string => {
    return EMOJI_MAP[name] || `:${name}:`
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 5))
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
      if (selectedFiles.length > 0) {
        const comment = input.trim() || undefined
        for (let i = 0; i < selectedFiles.length; i++) {
          await uploadFile(selectedFiles[i], i === 0 ? comment : undefined)
        }
        setSelectedFiles([])
      } else {
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
    const interval = setInterval(() => fetchMessages(true), 3000)
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
    if (mimetype?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (mimetype?.startsWith('video/')) return <Video className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  // Helper to create proxied URL for Slack private files
  const getProxiedUrl = (url: string | undefined) => {
    if (!url) return null
    return `/api/slack/file?url=${encodeURIComponent(url)}`
  }

  // Render file attachments
  const renderFiles = (files: ChatFile[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {files.map((file) => {
          const isImage = file.mimetype?.startsWith('image/')
          const isVideo = file.mimetype?.startsWith('video/')
          const thumbUrl = file.thumb_720 || file.thumb_480 || file.thumb_360
          const proxiedThumbUrl = getProxiedUrl(thumbUrl)
          const proxiedFullUrl = getProxiedUrl(file.url_private)

          // Render images with proxied thumbnail
          if (isImage && proxiedThumbUrl) {
            return (
              <a
                key={file.id}
                href={proxiedFullUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block max-w-[200px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors"
              >
                <img src={proxiedThumbUrl} alt={file.name} className="w-full h-auto" />
              </a>
            )
          }

          // Render videos with <video> tag
          if (isVideo && proxiedFullUrl) {
            return (
              <div
                key={file.id}
                className="max-w-[280px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <video
                  src={proxiedFullUrl}
                  controls
                  preload="metadata"
                  className="w-full h-auto max-h-[200px]"
                >
                  Din webbläsare stöder inte video.
                </video>
                <div className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-[10px] text-gray-500 truncate">
                  {file.name}
                </div>
              </div>
            )
          }

          // Render other files as download links
          return (
            <a
              key={file.id}
              href={proxiedFullUrl || file.url_private || '#'}
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

        {attachment.title && (
          <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {attachment.title_link ? (
              <a href={attachment.title_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {attachment.title}
              </a>
            ) : attachment.title}
          </h4>
        )}

        {attachment.text && (
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {attachment.text}
          </p>
        )}

        {attachment.image_url && (
          <img
            src={attachment.image_url}
            alt=""
            className="mt-2 max-w-full max-h-32 rounded border border-gray-200 dark:border-gray-700"
          />
        )}

        {attachment.thumb_url && !attachment.image_url && (
          <img
            src={attachment.thumb_url}
            alt=""
            className="mt-2 w-16 h-16 rounded object-cover border border-gray-200 dark:border-gray-700"
          />
        )}

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

  // Render a single message
  const renderMessage = (msg: ChatMessage, isReply = false) => {
    const hasRenderableBlocks = msg.blocks && msg.blocks.length > 0 &&
      msg.blocks.some(b => ['section', 'context', 'actions', 'header', 'divider', 'image'].includes(b.type))
    const hasAttachments = msg.attachments && msg.attachments.length > 0
    const hasFiles = msg.files && msg.files.length > 0
    const isPinned = isMessagePinned(msg.timestamp)
    const presence = userPresence[msg.user.id]
    const hasReplies = msg.replyCount && msg.replyCount > 0
    const isExpanded = expandedThreads.has(msg.timestamp)
    const isLoadingThread = loadingThreads.has(msg.timestamp)
    const replies = threadReplies[msg.timestamp] || []

    return (
      <div key={msg.id} className={`flex gap-1.5 group relative ${isReply ? 'ml-5 pl-2 border-l-2 border-gray-200 dark:border-gray-700' : ''}`}>
        {/* Avatar with presence indicator */}
        <div className="relative">
          <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
            {msg.user.avatar ? (
              <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(msg.user.name)
            )}
          </div>
          {/* Presence dot */}
          {presence && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0d1117] ${
                presence === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}
              title={presence === 'active' ? 'Online' : 'Borta'}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate">
              {msg.user.name.split(' ')[0]}
            </span>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(msg.timestamp)}
            </span>
            {isPinned && (
              <Pin className="w-2.5 h-2.5 text-amber-500" />
            )}
          </div>

          {/* Block Kit content or regular message */}
          {hasRenderableBlocks ? (
            <div className="text-xs">
              <BlockKitRenderer blocks={msg.blocks!} attachments={msg.attachments} users={users} />
            </div>
          ) : (
            <>
              {msg.text && (
                <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                  {parseSlackMrkdwn(msg.text, users)}
                </div>
              )}
              {hasAttachments && msg.attachments!.map((att, i) => renderAttachment(att, i))}
            </>
          )}

          {hasFiles && renderFiles(msg.files!)}

          {/* Inline reaction buttons + existing reactions */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {/* Existing reactions */}
            {msg.reactions && msg.reactions.map((reaction) => (
              <button
                key={reaction.name}
                onClick={() => handleReact(msg.id, reaction.name)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded text-[10px] transition-colors"
                title={reaction.users.map(id => users[id] || id).join(', ')}
              >
                <span>{getEmojiChar(reaction.name)}</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{reaction.count}</span>
              </button>
            ))}

            {/* Quick reaction buttons (visible on hover) */}
            <div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {INLINE_REACTIONS.map(({ name, emoji }) => (
                <button
                  key={name}
                  onClick={() => handleReact(msg.id, name)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-xs"
                  title={name}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Thread replies indicator */}
          {hasReplies && !isReply && (
            <button
              onClick={() => toggleThread(msg.timestamp)}
              className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <MessageCircle className="w-3 h-3" />
              <span>{msg.replyCount} {msg.replyCount === 1 ? 'svar' : 'svar'}</span>
              {isLoadingThread && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
          )}

          {/* Expanded thread replies */}
          {isExpanded && replies.length > 0 && (
            <div className="mt-1.5 space-y-1.5">
              {replies.map(reply => renderMessage(reply, true))}
            </div>
          )}
        </div>

        {/* Hover actions */}
        <div className="absolute -top-1 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Pin button */}
          <button
            onClick={() => handlePin(msg.timestamp, isPinned)}
            className={`p-1 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
              isPinned ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
            }`}
            title={isPinned ? 'Ta bort nål' : 'Nåla fast'}
          >
            <Pin className="w-3 h-3" />
          </button>

          {/* More emoji button */}
          <button
            onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
            className="p-1 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
          >
            <Smile className="w-3 h-3" />
          </button>
        </div>

        {/* Extended emoji picker */}
        {showEmojiPicker === msg.id && (
          <div className="absolute -top-8 right-0 flex gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-10">
            {QUICK_REACTIONS.slice(0, 8).map(({ name, emoji }) => (
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
  }

  // Compute max height style
  const maxHeightStyle = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight

  return (
    <div className={`flex flex-col ${maxHeight === '100%' ? 'h-full' : ''}`}>
      {/* Pinned messages toggle */}
      {pinnedMessages.length > 0 && (
        <button
          onClick={() => setShowPinned(!showPinned)}
          className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <Pin className="w-3.5 h-3.5" />
          <span className="font-medium">{pinnedMessages.length} nålade meddelanden</span>
          {showPinned ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
      )}

      {/* Pinned messages list */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="mb-3 p-2 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
          {pinnedMessages.map((pin) => (
            <div key={pin.timestamp} className="flex items-start gap-2 text-xs">
              <Pin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-700 dark:text-gray-300 line-clamp-2">{pin.text}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  Nålad av {users[pin.pinnedBy] || pin.pinnedBy}
                </p>
              </div>
              <button
                onClick={() => handlePin(pin.timestamp, true)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Ta bort nål"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className={`overflow-y-auto space-y-2 mb-2 pr-1 ${maxHeight === '100%' ? 'flex-1 min-h-0' : ''}`}
        style={maxHeight === '100%' ? {} : { maxHeight: maxHeightStyle }}
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
          messages.map((msg) => renderMessage(msg))
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
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="relative flex items-center gap-2">
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
