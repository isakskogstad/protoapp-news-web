// Slack message parsing utilities - Enhanced version

// Common Slack emoji mappings (expanded)
export const EMOJI_MAP: Record<string, string> = {
  // Faces
  'smile': '😄', 'smiley': '😃', 'grinning': '😀', 'blush': '😊',
  'relaxed': '☺️', 'wink': '😉', 'heart_eyes': '😍', 'kissing_heart': '😘',
  'stuck_out_tongue': '😛', 'stuck_out_tongue_winking_eye': '😜',
  'stuck_out_tongue_closed_eyes': '😝', 'disappointed': '😞',
  'worried': '😟', 'angry': '😠', 'rage': '😡', 'cry': '😢',
  'persevere': '😣', 'triumph': '😤', 'sleepy': '😪', 'sweat': '😓',
  'sob': '😭', 'joy': '😂', 'astonished': '😲', 'scream': '😱',
  'tired_face': '😫', 'sleeping': '😴', 'sunglasses': '😎', 'confused': '😕',
  'innocent': '😇', 'smirk': '😏', 'expressionless': '😑', 'neutral_face': '😐',
  'thinking_face': '🤔', 'thinking': '🤔', 'face_with_rolling_eyes': '🙄',
  'hushed': '😯', 'frowning': '😦', 'anguished': '😧', 'open_mouth': '😮',
  'grimacing': '😬', 'zipper_mouth_face': '🤐', 'mask': '😷',
  'nerd_face': '🤓', 'cowboy_hat_face': '🤠', 'clown_face': '🤡',
  'nauseated_face': '🤢', 'rofl': '🤣', 'drooling_face': '🤤',
  'lying_face': '🤥', 'sneezing_face': '🤧', 'money_mouth_face': '🤑',
  'face_with_thermometer': '🤒', 'face_with_head_bandage': '🤕',
  'slightly_smiling_face': '🙂', 'slightly_frowning_face': '🙁',
  'upside_down_face': '🙃', 'face_with_monocle': '🧐', 'star_struck': '🤩',
  'zany_face': '🤪', 'shushing_face': '🤫', 'face_with_symbols_on_mouth': '🤬',
  'face_with_hand_over_mouth': '🤭', 'face_vomiting': '🤮', 'exploding_head': '🤯',
  'pleading_face': '🥺', 'partying_face': '🥳', 'hot_face': '🥵', 'cold_face': '🥶',
  'woozy_face': '🥴', 'yawning_face': '🥱',

  // Gestures
  'thumbsup': '👍', '+1': '👍', 'thumbsdown': '👎', '-1': '👎',
  'ok_hand': '👌', 'punch': '👊', 'fist': '✊', 'v': '✌️',
  'wave': '👋', 'hand': '✋', 'raised_hand': '✋', 'open_hands': '👐',
  'point_up': '☝️', 'point_down': '👇', 'point_left': '👈', 'point_right': '👉',
  'raised_hands': '🙌', 'pray': '🙏', 'clap': '👏', 'muscle': '💪',
  'metal': '🤘', 'fu': '🖕', 'writing_hand': '✍️', 'selfie': '🤳',
  'nail_care': '💅', 'ring': '💍', 'lipstick': '💄',

  // Hearts
  'heart': '❤️', 'yellow_heart': '💛', 'green_heart': '💚', 'blue_heart': '💙',
  'purple_heart': '💜', 'black_heart': '🖤', 'broken_heart': '💔',
  'heavy_heart_exclamation': '❣️', 'two_hearts': '💕', 'revolving_hearts': '💞',
  'heartbeat': '💓', 'heartpulse': '💗', 'sparkling_heart': '💖',
  'cupid': '💘', 'gift_heart': '💝', 'heart_decoration': '💟',
  'orange_heart': '🧡', 'white_heart': '🤍', 'brown_heart': '🤎',

  // Objects & Symbols
  'fire': '🔥', 'star': '⭐', 'star2': '🌟', 'sparkles': '✨',
  'zap': '⚡', 'sunny': '☀️', 'cloud': '☁️', 'snowflake': '❄️',
  'rainbow': '🌈', 'umbrella': '☂️', 'coffee': '☕', 'beer': '🍺',
  'beers': '🍻', 'cocktail': '🍸', 'tropical_drink': '🍹', 'wine_glass': '🍷',
  'fork_and_knife': '🍴', 'pizza': '🍕', 'hamburger': '🍔', 'fries': '🍟',
  'popcorn': '🍿', 'cake': '🍰', 'cookie': '🍪', 'chocolate_bar': '🍫',
  'candy': '🍬', 'lollipop': '🍭', 'ice_cream': '🍨', 'doughnut': '🍩',
  'apple': '🍎', 'green_apple': '🍏', 'banana': '🍌', 'orange': '🍊',
  'rocket': '🚀', 'airplane': '✈️', 'car': '🚗', 'taxi': '🚕',
  'tada': '🎉', 'party_popper': '🎉', 'confetti_ball': '🎊',
  'balloon': '🎈', 'gift': '🎁', 'ribbon': '🎀',
  'trophy': '🏆', 'medal_sports': '🏅', 'medal_military': '🎖️',
  'crown': '👑', 'gem': '💎', 'moneybag': '💰', 'dollar': '💵',
  'bulb': '💡', 'book': '📖', 'books': '📚', 'memo': '📝',
  'pencil': '✏️', 'pencil2': '✏️', 'pen': '🖊️',
  'link': '🔗', 'paperclip': '📎', 'scissors': '✂️',
  'lock': '🔒', 'unlock': '🔓', 'key': '🔑',
  'phone': '📱', 'computer': '💻', 'keyboard': '⌨️',

  // Status & Misc
  'white_check_mark': '✅', 'check': '✔️', 'heavy_check_mark': '✔️',
  'x': '❌', 'negative_squared_cross_mark': '❎',
  'exclamation': '❗', 'question': '❓', 'grey_exclamation': '❕', 'grey_question': '❔',
  'warning': '⚠️', 'no_entry': '⛔', 'no_entry_sign': '🚫',
  'eyes': '👀', 'eye': '👁️', 'ear': '👂',
  '100': '💯', 'zzz': '💤', 'poop': '💩',
  'skull': '💀', 'ghost': '👻', 'alien': '👽', 'robot': '🤖',
  'see_no_evil': '🙈', 'hear_no_evil': '🙉', 'speak_no_evil': '🙊',
}

// Popular reaction emojis for quick picker
export const QUICK_REACTIONS = [
  { name: 'thumbsup', emoji: '👍' },
  { name: 'heart', emoji: '❤️' },
  { name: 'joy', emoji: '😂' },
  { name: 'fire', emoji: '🔥' },
  { name: 'eyes', emoji: '👀' },
  { name: 'tada', emoji: '🎉' },
  { name: 'thinking_face', emoji: '🤔' },
  { name: 'white_check_mark', emoji: '✅' },
]

// Extended emoji categories for picker
export const EMOJI_CATEGORIES = {
  'Vanliga': ['👍', '❤️', '😂', '🔥', '👀', '🎉', '🤔', '✅', '👎', '😢', '😮', '🙏'],
  'Ansikten': ['😀', '😃', '😄', '😊', '😉', '😍', '🤩', '😎', '🥳', '😏', '😌', '😴', '🤔', '😕', '😢', '😭', '😱', '🤯', '😡'],
  'Gester': ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '🙏', '👋', '✋', '👊'],
  'Hjärtan': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕', '💖', '💗'],
  'Objekt': ['🔥', '⭐', '✨', '🎉', '🎊', '🎁', '🏆', '💡', '📌', '✅', '❌', '⚠️'],
}

// System message subtypes to filter out
const SYSTEM_SUBTYPES = [
  'channel_join', 'channel_leave', 'channel_topic', 'channel_purpose',
  'channel_name', 'channel_archive', 'channel_unarchive',
  'group_join', 'group_leave', 'group_topic', 'group_purpose',
  'group_name', 'group_archive', 'group_unarchive',
  'bot_add', 'bot_remove', 'pinned_item', 'unpinned_item',
]

// Check if message is a system message
export function isSystemMessage(message: { subtype?: string; text?: string }): boolean {
  if (message.subtype && SYSTEM_SUBTYPES.includes(message.subtype)) {
    return true
  }

  const text = message.text || ''
  const systemPatterns = [
    /^<@\w+> has joined the channel$/,
    /^<@\w+> has left the channel$/,
    /^<@\w+> set the channel topic/,
    /^<@\w+> set the channel purpose/,
    /^<@\w+> added an integration/,
    /^<@\w+> removed an integration/,
    /pinned a message/,
    /unpinned a message/,
  ]

  return systemPatterns.some(pattern => pattern.test(text))
}

// Convert Slack emoji codes to Unicode emoji
export function parseEmoji(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/gi, (match, emojiName) => {
    const emoji = EMOJI_MAP[emojiName.toLowerCase()]
    return emoji || match
  })
}

// Parse Slack user mentions <@U123ABC> to display names
export function parseUserMentions(
  text: string,
  userMap: Map<string, string> | Record<string, string>
): string {
  const getUser = (id: string) => {
    if (userMap instanceof Map) return userMap.get(id)
    return userMap[id]
  }

  return text.replace(/<@(\w+)>/g, (match, userId) => {
    const userName = getUser(userId)
    return userName ? `@${userName}` : match
  })
}

// Parse Slack channel mentions <#C123ABC|channel-name>
export function parseChannelMentions(text: string): string {
  return text.replace(/<#\w+\|([^>]+)>/g, '#$1')
}

// Parse Slack links <url|text> or <url>
export function parseLinks(text: string): { text: string; links: Array<{ url: string; text: string }> } {
  const links: Array<{ url: string; text: string }> = []

  // Links with display text: <https://example.com|Example>
  let parsed = text.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, (_, url, linkText) => {
    links.push({ url, text: linkText })
    return `[${linkText}](${url})`
  })

  // Links without display text: <https://example.com>
  parsed = parsed.replace(/<(https?:\/\/[^>]+)>/g, (_, url) => {
    links.push({ url, text: url })
    return `[${url}](${url})`
  })

  // Email links
  parsed = parsed.replace(/<mailto:([^|>]+)\|([^>]+)>/g, '[$2](mailto:$1)')
  parsed = parsed.replace(/<mailto:([^>]+)>/g, '[$1](mailto:$1)')

  return { text: parsed, links }
}

// Parse Slack special commands <!here>, <!channel>, <!everyone>
export function parseSpecialMentions(text: string): string {
  return text
    .replace(/<!here>/g, '@här')
    .replace(/<!channel>/g, '@kanal')
    .replace(/<!everyone>/g, '@alla')
    .replace(/<!here\|here>/g, '@här')
    .replace(/<!channel\|channel>/g, '@kanal')
    .replace(/<!everyone\|everyone>/g, '@alla')
}

// Parse Slack formatting to HTML-safe format
export function parseSlackFormatting(text: string): string {
  // Bold: *text*
  text = text.replace(/(?<![:\w])\*([^*\n]+)\*(?![:\w])/g, '<strong>$1</strong>')

  // Italic: _text_
  text = text.replace(/(?<![:\w])_([^_\n]+)_(?![:\w])/g, '<em>$1</em>')

  // Strikethrough: ~text~
  text = text.replace(/~([^~\n]+)~/g, '<del>$1</del>')

  // Code: `text`
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // Code block: ```text```
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

  return text
}

// Parse message from bot format "*UserName:* message" to extract user
export function parseBotMessage(text: string): { userName: string | null; cleanText: string } {
  const botMatch = text.match(/^\*([^:*]+):\*\s*([\s\S]*)$/)
  if (botMatch) {
    return {
      userName: botMatch[1].trim(),
      cleanText: botMatch[2].trim()
    }
  }
  return { userName: null, cleanText: text }
}

// Full message parsing pipeline
export function parseSlackMessage(
  text: string,
  userMap: Map<string, string> | Record<string, string> = new Map()
): { html: string; links: Array<{ url: string; text: string }> } {
  let parsed = text

  parsed = parseSpecialMentions(parsed)
  parsed = parseUserMentions(parsed, userMap)
  parsed = parseChannelMentions(parsed)

  const { text: linkedText, links } = parseLinks(parsed)
  parsed = linkedText

  parsed = parseSlackFormatting(parsed)
  parsed = parseEmoji(parsed)

  // Convert markdown links to HTML
  parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')

  // Convert newlines to <br>
  parsed = parsed.replace(/\n/g, '<br>')

  return { html: parsed, links }
}

// Extract URLs from text for link previews
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>\[\]]+/g
  const matches = text.match(urlRegex) || []
  return Array.from(new Set(matches))
}

// Check if URL is an image
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  const lowercaseUrl = url.toLowerCase()
  return imageExtensions.some(ext => lowercaseUrl.includes(ext))
}

// Format relative time
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(parseFloat(timestamp) * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just nu'
  if (diffMins < 60) return `${diffMins} min sedan`
  if (diffHours < 24) return `${diffHours} tim sedan`
  if (diffDays < 7) return `${diffDays} dagar sedan`

  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

// Format timestamp for display
export function formatTime(ts: string): string {
  const date = new Date(parseFloat(ts) * 1000)
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

// Format date header
export function formatDateHeader(ts: string): string {
  const date = new Date(parseFloat(ts) * 1000)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Idag'
  if (date.toDateString() === yesterday.toDateString()) return 'Igår'

  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

// Get user initials from name
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Filter users for autocomplete
export function filterUsersForMention(
  query: string,
  users: Record<string, string>
): Array<{ id: string; name: string }> {
  const lowerQuery = query.toLowerCase()
  return Object.entries(users)
    .filter(([_, name]) => name.toLowerCase().includes(lowerQuery))
    .map(([id, name]) => ({ id, name }))
    .slice(0, 8)
}

// Search emojis by name
export function searchEmojis(query: string): Array<{ name: string; emoji: string }> {
  const lowerQuery = query.toLowerCase()
  return Object.entries(EMOJI_MAP)
    .filter(([name]) => name.includes(lowerQuery))
    .map(([name, emoji]) => ({ name, emoji }))
    .slice(0, 20)
}
