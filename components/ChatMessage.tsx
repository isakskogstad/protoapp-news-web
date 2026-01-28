'use client'

import { useState, useRef } from 'react'
import { MessageCircle, Smile, MoreHorizontal, Pencil, Trash2, RotateCcw, X, Loader2, Pin } from 'lucide-react'
import { parseSlackMessage, formatTime, getInitials, EMOJI_MAP, extractUrls } from '@/lib/slack-utils'
import { ChatMessage as ChatMessageType } from '@/lib/slack-types'
import { QuickReactions } from './EmojiPicker'
import EmojiPicker from './EmojiPicker'
import LinkPreviewCard from './LinkPreviewCard'
import BlockKitRenderer from './BlockKitRenderer'

interface ChatMessageProps {
  message: ChatMessageType
  users: Record<string, string>
  onReact: (timestamp: string, emoji: string) => void
  onOpenThread: (message: ChatMessageType) => void
  isThreadView?: boolean
  // Edit/delete support
  onEdit?: (message: ChatMessageType) => void
  onDelete?: (timestamp: string) => void
  currentUserId?: string
  // Pending message support
  onRetry?: (localId: string) => void
  onDeletePending?: (localId: string) => void
  // Presence
  userPresence?: Record<string, string>
  // Pinning
  onPin?: (timestamp: string) => void
  isPinned?: boolean
}

export default function ChatMessage({
  message,
  users,
  onReact,
  onOpenThread,
  isThreadView = false,
  onEdit,
  onDelete,
  currentUserId,
  onRetry,
  onDeletePending,
  userPresence,
  onPin,
  isPinned,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showQuickReactions, setShowQuickReactions] = useState(false)
  const [showMessageMenu, setShowMessageMenu] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { html, links } = parseSlackMessage(message.text, users)
  const urls = extractUrls(message.text)

  // Check if this is a pending/failed message
  const isPending = message.status === 'pending'
  const isFailed = message.status === 'failed'

  // Check if current user owns this message (for edit/delete)
  const isOwnMessage = currentUserId && message.user.id === currentUserId

  // Get user presence
  const presence = userPresence?.[message.user.id]
  const isOnline = presence === 'active'

  const handleReact = (emoji: string, name: string) => {
    onReact(message.id, name)
    setShowEmojiPicker(false)
    setShowQuickReactions(false)
    setShowActions(false)
  }

  // Get emoji character from name
  const getEmojiChar = (name: string): string => {
    return EMOJI_MAP[name] || `:${name}:`
  }

  return (
    <div
      className={`group relative flex gap-2.5 px-2 py-1.5 -mx-2 rounded-lg transition-colors ${
        isPending ? 'opacity-60' : ''
      } ${isFailed ? 'bg-red-50/50 dark:bg-red-900/20' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/50'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        if (!showEmojiPicker && !showMessageMenu) {
          setShowActions(false)
          setShowQuickReactions(false)
          setShowMessageMenu(false)
        }
      }}
    >
      {/* Avatar with presence indicator */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 overflow-hidden shadow-sm">
          {message.user.avatar ? (
            <img src={message.user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(message.user.name)
          )}
        </div>
        {/* Presence indicator */}
        {userPresence && !isPending && !isFailed && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={isOnline ? 'Online' : 'Borta'}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {message.user.name}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1">
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isFailed && <span className="text-red-500">Misslyckades</span>}
            {!isPending && !isFailed && formatTime(message.timestamp)}
          </span>
        </div>

        {/* Block Kit content or message text */}
        {message.blocks && message.blocks.length > 0 ? (
          <BlockKitRenderer blocks={message.blocks} users={users} />
        ) : (
          <div
            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words prose prose-sm dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {/* Link previews */}
        {urls.length > 0 && !message.blocks && (
          <div className="mt-2 space-y-2">
            {urls.slice(0, 2).map((url) => (
              <LinkPreviewCard key={url} url={url} />
            ))}
          </div>
        )}

        {/* Failed message actions */}
        {isFailed && message.localId && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => onRetry?.(message.localId!)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Försök igen
            </button>
            <button
              onClick={() => onDeletePending?.(message.localId!)}
              className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              <X className="w-3 h-3" />
              Ta bort
            </button>
          </div>
        )}

        {/* Files/Images */}
        {message.files && message.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.files.map((file) => (
              <div key={file.id} className="relative">
                {file.mimetype?.startsWith('image/') && file.thumb_360 ? (
                  <img
                    src={file.thumb_360}
                    alt={file.name}
                    className="max-w-[200px] max-h-[150px] rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                    📎 {file.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.name}
                onClick={() => onReact(message.id, reaction.name)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-xs transition-colors"
                title={reaction.users.map(id => users[id] || id).join(', ')}
              >
                <span>{getEmojiChar(reaction.name)}</span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">{reaction.count}</span>
              </button>
            ))}
            <button
              onClick={() => setShowQuickReactions(true)}
              className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            >
              <Smile className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}

        {/* Thread indicator */}
        {!isThreadView && message.isThreadParent && message.replyCount && (
          <button
            onClick={() => onOpenThread(message)}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{message.replyCount} {message.replyCount === 1 ? 'svar' : 'svar'}</span>
          </button>
        )}
      </div>

      {/* Hover actions */}
      {showActions && !isPending && !isFailed && (
        <div
          ref={actionsRef}
          className="absolute -top-3 right-0 flex items-center gap-1"
        >
          {showQuickReactions ? (
            <QuickReactions
              onReact={handleReact}
              onOpenFull={() => {
                setShowQuickReactions(false)
                setShowEmojiPicker(true)
              }}
            />
          ) : (
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-0.5">
              <button
                onClick={() => setShowQuickReactions(true)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Reagera"
              >
                <Smile className="w-4 h-4" />
              </button>
              {!isThreadView && (
                <button
                  onClick={() => onOpenThread(message)}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Svara i tråd"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
              {/* Pin button */}
              {onPin && (
                <button
                  onClick={() => onPin(message.id)}
                  className={`p-1.5 rounded transition-colors ${
                    isPinned
                      ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isPinned ? 'Ta bort fastnålning' : 'Nåla fast'}
                >
                  <Pin className="w-4 h-4" />
                </button>
              )}
              {/* Edit/Delete menu for own messages */}
              {isOwnMessage && onEdit && onDelete && (
                <div className="relative">
                  <button
                    onClick={() => setShowMessageMenu(!showMessageMenu)}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Fler alternativ"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showMessageMenu && (
                    <div
                      ref={menuRef}
                      className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                    >
                      <button
                        onClick={() => {
                          onEdit(message)
                          setShowMessageMenu(false)
                          setShowActions(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Redigera
                      </button>
                      <button
                        onClick={() => {
                          onDelete(message.id)
                          setShowMessageMenu(false)
                          setShowActions(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Ta bort
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full emoji picker */}
      {showEmojiPicker && (
        <div className="absolute top-0 right-0 z-50">
          <EmojiPicker
            onSelect={handleReact}
            onClose={() => {
              setShowEmojiPicker(false)
              setShowActions(false)
            }}
            position="bottom"
          />
        </div>
      )}
    </div>
  )
}
