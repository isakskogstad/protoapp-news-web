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

    const userMap = await fetchAllUsers()

    // Fetch thread replies if thread_ts is provided
    if (threadTs) {
      const url = new URL('https://slack.com/api/conversations.replies')
      url.searchParams.set('channel', SLACK_CHANNEL_ID)
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
    url.searchParams.set('channel', SLACK_CHANNEL_ID)
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
    const { text, thread_ts } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    const userName = session.user?.name || session.user?.email || 'Anonym'

    const payload: Record<string, unknown> = {
      channel: SLACK_CHANNEL_ID,
      text: `*${userName}:* ${text.trim()}`,
      unfurl_links: true,
      unfurl_media: true,
    }

    // Add thread_ts for thread replies
    if (thread_ts) {
      payload.thread_ts = thread_ts
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, ts: data.ts, message: data.message })

  } catch (error) {
    console.error('Error sending Slack message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
