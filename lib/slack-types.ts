// Slack chat type definitions

export interface ChatUser {
  id: string
  name: string
  avatar: string | null
}

export interface ChatReaction {
  name: string
  count: number
  users: string[]
}

export interface ChatFile {
  id: string
  name: string
  mimetype: string
  url_private?: string
  thumb_360?: string
}

export interface ChatMessage {
  id: string
  text: string
  timestamp: string
  threadTs?: string
  replyCount?: number
  user: ChatUser
  reactions: ChatReaction[]
  files?: ChatFile[]
  isThreadParent?: boolean
  isThreadReply?: boolean
}

export interface ChatSettings {
  soundEnabled: boolean
  notificationsEnabled: boolean
  compactMode: boolean
}

export interface TypingUser {
  userId?: string
  userName: string
  timestamp?: number
}
