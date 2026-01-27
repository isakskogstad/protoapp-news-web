'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { parseSlackMessage, parseEmoji, extractUrls } from '@/lib/slack-utils'

interface ChatReaction {
  name: string
  count: number
  users: string[]
}

interface ChatMessage {
  id: string
  text: string
  timestamp: string
  threadTs?: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
  reactions: ChatReaction[]
}

interface EditorialChatProps {
  className?: string
}

// Common emoji reactions for quick picker
const QUICK_REACTIONS = [
  { name: 'thumbsup', emoji: '👍' },
  { name: 'heart', emoji: '❤️' },
  { name: 'joy', emoji: '😂' },
  { name: 'fire', emoji: '🔥' },
  { name: 'eyes', emoji: '👀' },
  { name: 'tada', emoji: '🎉' },
  { name: 'thinking_face', emoji: '🤔' },
  { name: 'white_check_mark', emoji: '✅' },
]

// Simple markdown renderer component
function MarkdownText({ text, userMap }: { text: string; userMap: Map<string, string> }) {
  // Parse Slack formatting first
  const parsed = parseSlackMessage(text, userMap)

  // Convert markdown to JSX
  const renderMarkdown = (content: string) => {
    const elements: React.ReactNode[] = []
    let key = 0

    // Split by code blocks first
    const codeBlockRegex = /```([\s\S]*?)```/g
    const parts = content.split(codeBlockRegex)

    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        // Code block
        elements.push(
          <pre key={key++} className="bg-gray-800 text-gray-100 rounded-md px-3 py-2 my-2 text-xs overflow-x-auto font-mono">
            {part.trim()}
          </pre>
        )
      } else {
        // Regular text - process inline formatting
        const lines = part.split('\n')
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            elements.push(<br key={key++} />)
          }

          // Process inline elements
          let remaining = line
          const lineElements: React.ReactNode[] = []
          let lineKey = 0

          // Process bold **text**
          remaining = remaining.replace(/\*\*([^*]+)\*\*/g, (_, text) => {
            return `__BOLD_START__${text}__BOLD_END__`
          })

          // Process italic *text*
          remaining = remaining.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, text) => {
            return `__ITALIC_START__${text}__ITALIC_END__`
          })

          // Process strikethrough ~~text~~
          remaining = remaining.replace(/~~([^~]+)~~/g, (_, text) => {
            return `__STRIKE_START__${text}__STRIKE_END__`
          })

          // Process inline code `text`
          remaining = remaining.replace(/`([^`]+)`/g, (_, text) => {
            return `__CODE_START__${text}__CODE_END__`
          })

          // Process links [text](url)
          remaining = remaining.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
            return `__LINK_START__${text}__LINK_SEP__${url}__LINK_END__`
          })

          // Now split and render
          const tokens = remaining.split(/(__(?:BOLD|ITALIC|STRIKE|CODE|LINK)_(?:START|END|SEP)__)/g)
          let inBold = false
          let inItalic = false
          let inStrike = false
          let inCode = false
          let inLink = false
          let linkText = ''

          tokens.forEach((token) => {
            if (token === '__BOLD_START__') { inBold = true; return }
            if (token === '__BOLD_END__') { inBold = false; return }
            if (token === '__ITALIC_START__') { inItalic = true; return }
            if (token === '__ITALIC_END__') { inItalic = false; return }
            if (token === '__STRIKE_START__') { inStrike = true; return }
            if (token === '__STRIKE_END__') { inStrike = false; return }
            if (token === '__CODE_START__') { inCode = true; return }
            if (token === '__CODE_END__') { inCode = false; return }
            if (token === '__LINK_START__') { inLink = true; return }
            if (token === '__LINK_SEP__') { return }
            if (token === '__LINK_END__') { inLink = false; linkText = ''; return }

            if (!token) return

            if (inLink && !linkText) {
              linkText = token
              return
            }

            if (inLink && linkText) {
              lineElements.push(
                <a
                  key={lineKey++}
                  href={token}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline break-all"
                >
                  {linkText}
                </a>
              )
              return
            }

            let element: React.ReactNode = token

            if (inCode) {
              element = (
                <code key={lineKey++} className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
                  {token}
                </code>
              )
            } else if (inBold) {
              element = <strong key={lineKey++} className="font-semibold">{token}</strong>
            } else if (inItalic) {
              element = <em key={lineKey++}>{token}</em>
            } else if (inStrike) {
              element = <s key={lineKey++} className="opacity-60">{token}</s>
            } else {
              element = <span key={lineKey++}>{token}</span>
            }

            lineElements.push(element)
          })

          elements.push(<span key={key++}>{lineElements}</span>)
        })
      }
    })

    return <>{elements}</>
  }

  return <>{renderMarkdown(parsed)}</>
}

// Emoji reaction component
function EmojiReaction({ reaction }: { reaction: ChatReaction }) {
  const emoji = parseEmoji(`:${reaction.name}:`)

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
      <span>{emoji}</span>
      <span className="text-gray-600 dark:text-gray-400">{reaction.count}</span>
    </span>
  )
}

// Link preview data type
interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

// Link preview cache
const linkPreviewCache = new Map<string, LinkPreviewData | null>()

// Link preview component
function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Check cache first
    if (linkPreviewCache.has(url)) {
      const cached = linkPreviewCache.get(url)
      setPreview(cached || null)
      setLoading(false)
      return
    }

    const fetchPreview = async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        linkPreviewCache.set(url, data)
        setPreview(data)
      } catch {
        linkPreviewCache.set(url, null)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [url])

  if (loading) {
    return (
      <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
        <div className="p-3 flex gap-3">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !preview || !preview.title) {
    return null
  }

  // Check if it's an internal LoopDesk news link
  const isInternalNews = url.includes('/news/')

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
    >
      <div className="flex gap-0">
        {/* Image */}
        {preview.image && (
          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-2.5 min-w-0">
          {/* Site info */}
          <div className="flex items-center gap-1.5 mb-1">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-3 h-3"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {isInternalNews ? 'LoopDesk' : preview.siteName}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {preview.title}
          </h4>

          {/* Description */}
          {preview.description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}

// Reaction picker component
function ReactionPicker({
  messageTs,
  onReactionAdded
}: {
  messageTs: string
  onReactionAdded: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  const addReaction = async (emojiName: string) => {
    setAdding(emojiName)
    try {
      const response = await fetch('/api/slack/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: messageTs, emoji: emojiName }),
      })
      if (response.ok) {
        onReactionAdded()
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    } finally {
      setAdding(null)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
        title="Lägg till reaktion"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-0.5 z-10">
          {QUICK_REACTIONS.map((reaction) => (
            <button
              key={reaction.name}
              onClick={() => addReaction(reaction.name)}
              disabled={adding === reaction.name}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-base disabled:opacity-50"
              title={`:${reaction.name}:`}
            >
              {adding === reaction.name ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                reaction.emoji
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Mention autocomplete component
function MentionAutocomplete({
  query,
  users,
  onSelect,
  onClose,
}: {
  query: string
  users: Map<string, string>
  onSelect: (userId: string, userName: string) => void
  onClose: () => void
}) {
  const filteredUsers = useMemo(() => {
    const entries = Array.from(users.entries())
    if (!query) return entries.slice(0, 5)

    const lowerQuery = query.toLowerCase()
    return entries
      .filter(([_, name]) => name.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
  }, [query, users])

  if (filteredUsers.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
      {filteredUsers.map(([userId, userName]) => (
        <button
          key={userId}
          onClick={() => {
            onSelect(userId, userName)
            onClose()
          }}
          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-medium text-white">
              {userName.substring(0, 1).toUpperCase()}
            </span>
          </span>
          <span className="text-gray-900 dark:text-gray-100">{userName}</span>
        </button>
      ))}
    </div>
  )
}

export default function EditorialChat({ className = '' }: EditorialChatProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map())
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastReadTimestamp = useRef<string | null>(null)
  const pollInterval = useRef<NodeJS.Timeout | null>(null)

  // Handle input changes and detect @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursor = e.target.selectionStart || 0
    setNewMessage(value)
    setCursorPosition(cursor)

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursor)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setShowMentions(true)
      setMentionQuery(atMatch[1])
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }
  }

  // Insert mention when selected
  const handleMentionSelect = (userId: string, userName: string) => {
    const textBeforeCursor = newMessage.substring(0, cursorPosition)
    const textAfterCursor = newMessage.substring(cursorPosition)

    // Find and replace the @query with the Slack mention format
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `<@${userId}> `)
    const newText = newTextBefore + textAfterCursor

    setNewMessage(newText)
    setShowMentions(false)
    setMentionQuery('')

    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Format timestamp to readable time
  const formatTime = (ts: string) => {
    const date = new Date(parseFloat(ts) * 1000)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fetch messages from API
  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/slack/messages?limit=100')
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      const data = await response.json()
      setMessages(data.messages || [])

      // Update user map
      if (data.users) {
        setUserMap(new Map(Object.entries(data.users)))
      }

      // Update unread count if panel is closed
      if (!isOpen && lastReadTimestamp.current && data.messages) {
        const newMessages = data.messages.filter(
          (m: ChatMessage) => parseFloat(m.timestamp) > parseFloat(lastReadTimestamp.current!)
        )
        setUnreadCount(newMessages.length)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      if (!silent) {
        setError('Kunde inte ladda meddelanden')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isOpen])

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setNewMessage('')
      // Refresh messages to show the new one
      await fetchMessages(true)
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Kunde inte skicka meddelande')
    } finally {
      setSending(false)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Load messages when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchMessages()
      // Mark as read
      if (messages.length > 0) {
        lastReadTimestamp.current = messages[messages.length - 1].timestamp
      }
      setUnreadCount(0)
    }
  }, [isOpen, fetchMessages])

  // Poll for new messages
  useEffect(() => {
    // Start polling when component mounts
    pollInterval.current = setInterval(() => {
      fetchMessages(true)
    }, 10000) // Poll every 10 seconds

    // Initial fetch
    fetchMessages(true)

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [fetchMessages])

  // Update last read timestamp when viewing messages
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      lastReadTimestamp.current = messages[messages.length - 1].timestamp
      setUnreadCount(0)
    }
  }, [isOpen, messages])

  if (!session) return null

  return (
    <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h3 className="font-semibold text-white">Redaktionen</h3>
              <span className="text-xs text-white/70">#{messages.length}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950 min-h-0">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                <button
                  onClick={() => fetchMessages()}
                  className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  Försök igen
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">Inga meddelanden än</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Var först att skriva!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3 group">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {message.user.avatar ? (
                        <img
                          src={message.user.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-white">
                          {message.user.name.substring(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Message content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {message.user.name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                        <ReactionPicker
                          messageTs={message.timestamp}
                          onReactionAdded={() => fetchMessages(true)}
                        />
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                        <MarkdownText text={message.text} userMap={userMap} />
                      </div>
                      {/* Link previews */}
                      {extractUrls(message.text).slice(0, 1).map((url, idx) => (
                        <LinkPreview key={idx} url={url} />
                      ))}
                      {/* Reactions */}
                      {message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.reactions.map((reaction, idx) => (
                            <EmojiReaction key={idx} reaction={reaction} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 relative">
            {/* Mention autocomplete */}
            {showMentions && (
              <MentionAutocomplete
                query={mentionQuery}
                users={userMap}
                onSelect={handleMentionSelect}
                onClose={() => setShowMentions(false)}
              />
            )}
            {error && messages.length > 0 && (
              <p className="text-xs text-red-500 mb-2">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Skriv ett meddelande... (@ för att nämna)"
                className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-lg transition-colors"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-gray-200 dark:bg-gray-700 rotate-0'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:scale-105'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}
