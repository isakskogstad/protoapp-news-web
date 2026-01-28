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

export type MessageStatus = 'pending' | 'sent' | 'failed'

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
  // Optimistic UI
  status?: MessageStatus
  localId?: string
  // Block Kit
  blocks?: Block[]
  attachments?: Attachment[]
}

// Block Kit types
export interface Block {
  type: 'section' | 'image' | 'divider' | 'context' | 'actions' | 'header'
  block_id?: string
  text?: TextObject
  accessory?: BlockElement
  fields?: TextObject[]
  elements?: BlockElement[]
  image_url?: string
  alt_text?: string
  title?: TextObject
}

export interface TextObject {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
  verbatim?: boolean
}

export interface BlockElement {
  type: 'button' | 'image' | 'static_select' | 'overflow' | 'datepicker' | 'plain_text_input'
  action_id?: string
  text?: TextObject
  value?: string
  url?: string
  style?: 'primary' | 'danger'
  image_url?: string
  alt_text?: string
  options?: SelectOption[]
  placeholder?: TextObject
}

export interface SelectOption {
  text: TextObject
  value: string
  description?: TextObject
}

export interface Attachment {
  color?: string
  fallback?: string
  pretext?: string
  author_name?: string
  author_link?: string
  author_icon?: string
  title?: string
  title_link?: string
  text?: string
  fields?: AttachmentField[]
  image_url?: string
  thumb_url?: string
  footer?: string
  footer_icon?: string
  ts?: number
}

export interface AttachmentField {
  title: string
  value: string
  short?: boolean
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
