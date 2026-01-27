// Slack message parsing utilities

// Common Slack emoji mappings
const EMOJI_MAP: Record<string, string> = {
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
  'bus': '🚌', 'ambulance': '🚑', 'fire_engine': '🚒', 'police_car': '🚓',
  'bike': '🚲', 'ship': '🚢', 'phone': '📱', 'computer': '💻',
  'keyboard': '⌨️', 'desktop_computer': '🖥️', 'printer': '🖨️',
  'camera': '📷', 'video_camera': '📹', 'movie_camera': '🎥',
  'tv': '📺', 'radio': '📻', 'speaker': '🔊', 'mute': '🔇',
  'bell': '🔔', 'no_bell': '🔕', 'mega': '📣', 'loudspeaker': '📢',
  'bulb': '💡', 'flashlight': '🔦', 'book': '📖', 'books': '📚',
  'bookmark': '🔖', 'link': '🔗', 'paperclip': '📎', 'scissors': '✂️',
  'lock': '🔒', 'unlock': '🔓', 'key': '🔑', 'hammer': '🔨',
  'wrench': '🔧', 'gear': '⚙️', 'bomb': '💣', 'gun': '🔫',
  'trophy': '🏆', 'medal_sports': '🏅', 'medal_military': '🎖️',
  'crown': '👑', 'gem': '💎', 'moneybag': '💰', 'dollar': '💵',
  'credit_card': '💳', 'chart': '💹', 'chart_with_upwards_trend': '📈',
  'chart_with_downwards_trend': '📉', 'envelope': '✉️', 'email': '📧',
  'inbox_tray': '📥', 'outbox_tray': '📤', 'package': '📦',
  'date': '📅', 'calendar': '📆', 'spiral_calendar': '🗓️',
  'memo': '📝', 'pencil': '✏️', 'pencil2': '✏️', 'pen': '🖊️',
  'clipboard': '📋', 'pushpin': '📌', 'round_pushpin': '📍',
  'triangular_flag_on_post': '🚩', 'white_flag': '🏳️', 'checkered_flag': '🏁',

  // Status & Misc
  'white_check_mark': '✅', 'check': '✔️', 'heavy_check_mark': '✔️',
  'x': '❌', 'negative_squared_cross_mark': '❎',
  'exclamation': '❗', 'question': '❓', 'grey_exclamation': '❕', 'grey_question': '❔',
  'bangbang': '‼️', 'interrobang': '⁉️',
  'warning': '⚠️', 'no_entry': '⛔', 'no_entry_sign': '🚫',
  'stop_sign': '🛑', 'construction': '🚧',
  'sos': '🆘', 'information_source': 'ℹ️',
  'arrow_right': '➡️', 'arrow_left': '⬅️', 'arrow_up': '⬆️', 'arrow_down': '⬇️',
  'arrow_upper_right': '↗️', 'arrow_lower_right': '↘️',
  'arrow_lower_left': '↙️', 'arrow_upper_left': '↖️',
  'arrows_counterclockwise': '🔄', 'rewind': '⏪', 'fast_forward': '⏩',
  'arrow_forward': '▶️', 'arrow_backward': '◀️',
  'new': '🆕', 'top': '🔝', 'up': '🆙', 'cool': '🆒', 'free': '🆓',
  'ok': '🆗', 'ng': '🆖', 'soon': '🔜', 'on': '🔛', 'end': '🔚', 'back': '🔙',
  '100': '💯', '1234': '🔢',
  'eyes': '👀', 'eye': '👁️', 'ear': '👂', 'nose': '👃', 'tongue': '👅', 'lips': '👄',
  'brain': '🧠', 'bone': '🦴',
  'dog': '🐶', 'cat': '🐱', 'mouse': '🐭', 'rabbit': '🐰', 'fox_face': '🦊',
  'bear': '🐻', 'panda_face': '🐼', 'koala': '🐨', 'tiger': '🐯', 'lion': '🦁',
  'cow': '🐮', 'pig': '🐷', 'frog': '🐸', 'monkey_face': '🐵', 'chicken': '🐔',
  'penguin': '🐧', 'bird': '🐦', 'baby_chick': '🐤', 'eagle': '🦅', 'owl': '🦉',
  'bat': '🦇', 'wolf': '🐺', 'horse': '🐴', 'unicorn': '🦄',
  'bee': '🐝', 'bug': '🐛', 'butterfly': '🦋', 'snail': '🐌', 'spider': '🕷️',
  'turtle': '🐢', 'snake': '🐍', 'lizard': '🦎', 'scorpion': '🦂',
  'crab': '🦀', 'shrimp': '🦐', 'squid': '🦑', 'octopus': '🐙',
  'whale': '🐳', 'dolphin': '🐬', 'fish': '🐟', 'tropical_fish': '🐠', 'shark': '🦈',
  'crocodile': '🐊', 'elephant': '🐘', 'rhinoceros': '🦏', 'hippopotamus': '🦛',
  'camel': '🐫', 'giraffe': '🦒', 'zebra': '🦓', 'gorilla': '🦍',
  'dragon': '🐉', 'dragon_face': '🐲', 'dinosaur': '🦕', 't-rex': '🦖',

  // Slack-specific
  'tada': '🎉', 'party_popper': '🎉', 'confetti_ball': '🎊',
  'balloon': '🎈', 'gift': '🎁', 'ribbon': '🎀',
  'speech_balloon': '💬', 'thought_balloon': '💭',
  'zzz': '💤', 'dizzy': '💫', 'sweat_drops': '💦', 'dash': '💨',
  'poop': '💩', 'hankey': '💩', 'shit': '💩',
  'skull': '💀', 'skull_and_crossbones': '☠️', 'ghost': '👻',
  'alien': '👽', 'robot': '🤖', 'jack_o_lantern': '🎃',
  'smiley_cat': '😺', 'smile_cat': '😸', 'joy_cat': '😹', 'heart_eyes_cat': '😻',
  'smirk_cat': '😼', 'kissing_cat': '😽', 'scream_cat': '🙀',
  'crying_cat_face': '😿', 'pouting_cat': '😾',
  'see_no_evil': '🙈', 'hear_no_evil': '🙉', 'speak_no_evil': '🙊',
}

// System message subtypes to filter out
const SYSTEM_SUBTYPES = [
  'channel_join',
  'channel_leave',
  'channel_topic',
  'channel_purpose',
  'channel_name',
  'channel_archive',
  'channel_unarchive',
  'group_join',
  'group_leave',
  'group_topic',
  'group_purpose',
  'group_name',
  'group_archive',
  'group_unarchive',
  'bot_add',
  'bot_remove',
  'file_share',
  'file_comment',
  'file_mention',
  'pinned_item',
  'unpinned_item',
]

// Check if message is a system message
export function isSystemMessage(message: { subtype?: string; text?: string }): boolean {
  // Check subtype
  if (message.subtype && SYSTEM_SUBTYPES.includes(message.subtype)) {
    return true
  }

  // Check for common system message patterns in text
  const text = message.text || ''
  const systemPatterns = [
    /^<@\w+> has joined the channel$/,
    /^<@\w+> has left the channel$/,
    /^<@\w+> set the channel topic/,
    /^<@\w+> set the channel purpose/,
    /^<@\w+> added an integration/,
    /^<@\w+> removed an integration/,
    /uploaded a file:/,
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
  userMap: Map<string, string>
): string {
  return text.replace(/<@(\w+)>/g, (match, userId) => {
    const userName = userMap.get(userId)
    return userName ? `@${userName}` : match
  })
}

// Parse Slack channel mentions <#C123ABC|channel-name>
export function parseChannelMentions(text: string): string {
  return text.replace(/<#\w+\|([^>]+)>/g, '#$1')
}

// Parse Slack links <url|text> or <url>
export function parseLinks(text: string): string {
  // Links with display text: <https://example.com|Example>
  text = text.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '[$2]($1)')

  // Links without display text: <https://example.com>
  text = text.replace(/<(https?:\/\/[^>]+)>/g, '[$1]($1)')

  // Email links: <mailto:email@example.com|email@example.com>
  text = text.replace(/<mailto:([^|>]+)\|([^>]+)>/g, '[$2](mailto:$1)')

  // Email links without display text
  text = text.replace(/<mailto:([^>]+)>/g, '[$1](mailto:$1)')

  return text
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

// Parse Slack formatting to markdown
export function parseSlackFormatting(text: string): string {
  // Bold: *text* (but not if it's an emoji like :star:)
  // Slack uses *text* for bold, which conflicts with markdown italic
  // We'll convert to **text** for proper markdown bold
  text = text.replace(/(?<![:\w])\*([^*\n]+)\*(?![:\w])/g, '**$1**')

  // Italic: _text_
  text = text.replace(/(?<![:\w])_([^_\n]+)_(?![:\w])/g, '*$1*')

  // Strikethrough: ~text~
  text = text.replace(/~([^~\n]+)~/g, '~~$1~~')

  // Code: `text`
  // Already markdown compatible

  // Code block: ```text```
  // Already markdown compatible

  // Blockquote: > text (at start of line)
  // Already markdown compatible

  return text
}

// Parse message from bot format "*UserName:* message" to extract user
export function parseBotMessage(text: string): { userName: string | null; cleanText: string } {
  // Match *UserName:* at the start, followed by the rest of the message
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
  userMap: Map<string, string> = new Map()
): string {
  let parsed = text

  // Order matters!
  parsed = parseSpecialMentions(parsed)
  parsed = parseUserMentions(parsed, userMap)
  parsed = parseChannelMentions(parsed)
  parsed = parseLinks(parsed)
  parsed = parseSlackFormatting(parsed)
  parsed = parseEmoji(parsed)

  return parsed
}

// Extract URLs from text for link previews
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>\[\]]+/g
  const matches = text.match(urlRegex) || []
  return Array.from(new Set(matches)) // Remove duplicates
}
