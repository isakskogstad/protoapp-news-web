import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSystemMessage, parseBotMessage } from '@/lib/slack-utils'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID

interface SlackMessage {
  ts: string
  text: string
  user?: string
  bot_id?: string
  subtype?: string
  thread_ts?: string
  reply_count?: number
  files?: Array<{
    id: string
    name: string
    mimetype: string
    url_private?: string
    thumb_360?: string
    thumb_480?: string
    thumb_720?: string
  }>
  reactions?: Array<{
    name: string
    count: number
    users: string[]
  }>
  // Block Kit support
  blocks?: Array<{
    type: string
    block_id?: string
    text?: { type: string; text: string; emoji?: boolean }
    accessory?: Record<string, unknown>
    fields?: Array<{ type: string; text: string }>
    elements?: Array<Record<string, unknown>>
    image_url?: string
    alt_text?: string
    title?: { type: string; text: string }
  }>
  attachments?: Array<{
    color?: string
    title?: string
    title_link?: string
    text?: string
    pretext?: string
    author_name?: string
    author_icon?: string
    author_link?: string
    fields?: Array<{ title: string; value: string; short?: boolean }>
    image_url?: string
    thumb_url?: string
    footer?: string
    footer_icon?: string
    ts?: number
  }>
}

interface SlackUser {
  id: string
  name: string
  real_name: string
  profile: {
    image_48: string
    display_name: string
  }
}

// In-memory cache for user info
const userCacheMemory = new Map<string, SlackUser>()
const USER_CACHE_TTL = 3600000 // 1 hour in ms
const userCacheTimestamps = new Map<string, number>()

async function getSlackUser(userId: string): Promise<SlackUser | null> {
  if (!userId) return null

  // Check memory cache with TTL
  const cachedTimestamp = userCacheTimestamps.get(userId)
  if (cachedTimestamp && Date.now() - cachedTimestamp < USER_CACHE_TTL) {
    const cached = userCacheMemory.get(userId)
    if (cached) return cached
  }

  // Fetch from Slack API
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
    })
    const data = await response.json()

    if (data.ok && data.user) {
      const user = data.user
      userCacheMemory.set(userId, user)
      userCacheTimestamps.set(userId, Date.now())
      return user
    }
  } catch (error) {
    console.error('Error fetching Slack user:', error)
  }
  return null
}

// Fetch all users for the workspace
async function fetchAllUsers(): Promise<Record<string, string>> {
  const userMap: Record<string, string> = {}

  try {
    const response = await fetch('https://slack.com/api/users.list?limit=500', {
      headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
    })
    const data = await response.json()

    if (data.ok && data.members) {
      for (const member of data.members) {
        const displayName = member.profile?.display_name || member.real_name || member.name
        userMap[member.id] = displayName
        userCacheMemory.set(member.id, member)
        userCacheTimestamps.set(member.id, Date.now())
      }
    }
  } catch (error) {
    console.error('Error fetching Slack users:', error)
  }

  return userMap
}

// Process a single message
async function processMessage(msg: SlackMessage, isThread = false): Promise<{
  id: string
  text: string
  timestamp: string
  threadTs?: string
  replyCount?: number
  user: { id: string; name: string; avatar: string | null }
  reactions: Array<{ name: string; count: number; users: string[] }>
  files?: Array<{ id: string; name: string; mimetype: string; url_private?: string; thumb_360?: string }>
  isThreadParent?: boolean
  isThreadReply?: boolean
  blocks?: SlackMessage['blocks']
  attachments?: SlackMessage['attachments']
}> {
  let userName = 'Okänd'
  let userAvatar: string | null = null
  let messageText = msg.text || ''
  let userId = msg.user || ''

  if (msg.bot_id && !msg.user) {
    const parsed = parseBotMessage(messageText)
    if (parsed.userName) {
      userName = parsed.userName
      messageText = parsed.cleanText
    } else {
      userName = 'LoopDesk'
    }
  } else if (msg.user) {
    const user = await getSlackUser(msg.user)
    userName = user?.profile?.display_name || user?.real_name || user?.name || 'Okänd'
    userAvatar = user?.profile?.image_48 || null
  }

  return {
    id: msg.ts,
    text: messageText,
    timestamp: msg.ts,
    threadTs: msg.thread_ts,
    replyCount: msg.reply_count,
    user: { id: userId, name: userName, avatar: userAvatar },
    reactions: msg.reactions?.map(r => ({
      name: r.name,
      count: r.count,
      users: r.users,
    })) || [],
    files: msg.files?.map(f => ({
      id: f.id,
      name: f.name,
      mimetype: f.mimetype,
      url_private: f.url_private,
      thumb_360: f.thumb_360,
    })),
    isThreadParent: !isThread && (msg.reply_count || 0) > 0,
    isThreadReply: isThread,
    // Pass through Block Kit content for rich messages
    blocks: msg.blocks,
    attachments: msg.attachments,
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') || '50'
    const oldest = searchParams.get('oldest')
    const latest = searchParams.get('latest')
    const threadTs = searchParams.get('thread_ts')
    const channelParam = searchParams.get('channel')

    // Use channel from query param or fall back to env variable
    const channel = channelParam || SLACK_CHANNEL_ID

    if (!channel) {
      return NextResponse.json({ error: 'No channel specified' }, { status: 400 })
    }

    const userMap = await fetchAllUsers()

    // Fetch thread replies if thread_ts is provided
    if (threadTs) {
      const url = new URL('https://slack.com/api/conversations.replies')
      url.searchParams.set('channel', channel)
      url.searchParams.set('ts', threadTs)
      url.searchParams.set('limit', limit)

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      })
      const data = await response.json()

      if (!data.ok) {
        return NextResponse.json({ error: data.error }, { status: 500 })
      }

      const messages = []
      for (const msg of (data.messages as SlackMessage[])) {
        if (isSystemMessage({ subtype: msg.subtype, text: msg.text })) continue
        messages.push(await processMessage(msg, true))
      }

      return NextResponse.json({
        messages,
        has_more: data.has_more || false,
        users: userMap,
      })
    }

    // Fetch channel history
    const url = new URL('https://slack.com/api/conversations.history')
    url.searchParams.set('channel', channel)
    url.searchParams.set('limit', limit)
    if (oldest) url.searchParams.set('oldest', oldest)
    if (latest) url.searchParams.set('latest', latest)

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
    })
    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    const messages = []
    for (const msg of (data.messages as SlackMessage[])) {
      if (isSystemMessage({ subtype: msg.subtype, text: msg.text })) continue
      // Skip thread replies in main view (they have thread_ts but no reply_count)
      if (msg.thread_ts && msg.thread_ts !== msg.ts) continue
      messages.push(await processMessage(msg))
    }

    messages.reverse()

    return NextResponse.json({
      messages,
      has_more: data.has_more || false,
      response_metadata: data.response_metadata,
      users: userMap,
    })

  } catch (error) {
    console.error('Error fetching Slack messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { text, thread_ts, blocks, asUser } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    const userName = session.user?.name || session.user?.email || 'Anonym'
    const userSlackToken = (session.user as any)?.slackAccessToken

    // Determine which token to use
    // Use user token if available and asUser is true (for ShareToChat etc.)
    const useUserToken = asUser && userSlackToken
    const token = useUserToken ? userSlackToken : SLACK_BOT_TOKEN

    // If using bot token, prefix with username for regular messages (not blocks)
    // If using user token, message will show as from the user automatically
    const messageText = useUserToken
      ? text.trim()
      : blocks
        ? text.trim()
        : `*${userName}:* ${text.trim()}`

    const payload: Record<string, unknown> = {
      channel: SLACK_CHANNEL_ID,
      text: messageText,
      unfurl_links: true,
      unfurl_media: true,
    }

    // Add blocks if provided
    if (blocks && Array.isArray(blocks)) {
      payload.blocks = blocks
    }

    // Add thread_ts for thread replies
    if (thread_ts) {
      payload.thread_ts = thread_ts
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data.ok) {
      // If user token failed for ANY reason, try with bot token as fallback
      if (useUserToken) {
        console.log(`User token failed with error: ${data.error}, falling back to bot token`)

        const botPayload = {
          ...payload,
          text: blocks ? text.trim() : `*${userName}:* ${text.trim()}`,
        }

        const botResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(botPayload),
        })

        const botData = await botResponse.json()
        if (!botData.ok) {
          console.error(`Bot token also failed: ${botData.error}`)
          return NextResponse.json({ error: botData.error }, { status: 500 })
        }
        return NextResponse.json({ success: true, ts: botData.ts, message: botData.message, sentAsBot: true })
      }

      console.error(`Slack message failed: ${data.error}`)
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, ts: data.ts, message: data.message, sentAsUser: useUserToken })

  } catch (error) {
    console.error('Error sending Slack message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { timestamp, text } = body

    if (!timestamp || !text?.trim()) {
      return NextResponse.json({ error: 'Timestamp and text are required' }, { status: 400 })
    }

    const userName = session.user?.name || session.user?.email || 'Anonym'

    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        ts: timestamp,
        text: `*${userName}:* ${text.trim()}`,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, ts: data.ts, message: data.message })

  } catch (error) {
    console.error('Error updating Slack message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { timestamp } = body

    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp is required' }, { status: 400 })
    }

    const response = await fetch('https://slack.com/api/chat.delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        ts: timestamp,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting Slack message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
