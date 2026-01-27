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

// Cache for user info to avoid repeated API calls
const userCache = new Map<string, SlackUser>()

async function getSlackUser(userId: string): Promise<SlackUser | null> {
  if (!userId) return null

  if (userCache.has(userId)) {
    return userCache.get(userId)!
  }

  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      },
    })
    const data = await response.json()
    if (data.ok && data.user) {
      userCache.set(userId, data.user)
      return data.user
    }
  } catch (error) {
    console.error('Error fetching Slack user:', error)
  }
  return null
}

// Fetch all users for the workspace (for @mention resolution)
async function fetchAllUsers(): Promise<Map<string, string>> {
  const userMap = new Map<string, string>()

  try {
    const response = await fetch('https://slack.com/api/users.list?limit=200', {
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      },
    })
    const data = await response.json()
    if (data.ok && data.members) {
      for (const member of data.members) {
        const displayName = member.profile?.display_name || member.real_name || member.name
        userMap.set(member.id, displayName)
        // Also cache the full user object
        userCache.set(member.id, member)
      }
    }
  } catch (error) {
    console.error('Error fetching Slack users:', error)
  }

  return userMap
}

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json(
      { error: 'Slack not configured' },
      { status: 500 }
    )
  }

  try {
    // Get query params
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') || '100'
    const oldest = searchParams.get('oldest')

    // Fetch user map for mention resolution
    const userMap = await fetchAllUsers()

    // Fetch channel history
    const url = new URL('https://slack.com/api/conversations.history')
    url.searchParams.set('channel', SLACK_CHANNEL_ID)
    url.searchParams.set('limit', limit)
    if (oldest) {
      url.searchParams.set('oldest', oldest)
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      },
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return NextResponse.json(
        { error: data.error || 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Filter and enrich messages
    const messages = []

    for (const msg of (data.messages as SlackMessage[])) {
      // Skip system messages
      if (isSystemMessage({ subtype: msg.subtype, text: msg.text })) {
        continue
      }

      // Handle bot messages (messages sent via our app)
      let userName = 'Unknown'
      let userAvatar: string | null = null
      let messageText = msg.text || ''
      let userId = msg.user || ''

      if (msg.bot_id && !msg.user) {
        // This is a bot message - try to extract the real user from the message
        const parsed = parseBotMessage(messageText)
        if (parsed.userName) {
          userName = parsed.userName
          messageText = parsed.cleanText
        } else {
          userName = 'LoopDesk'
        }
      } else if (msg.user) {
        // Regular user message
        const user = await getSlackUser(msg.user)
        userName = user?.profile?.display_name || user?.real_name || user?.name || 'Unknown'
        userAvatar = user?.profile?.image_48 || null
      }

      messages.push({
        id: msg.ts,
        text: messageText,
        timestamp: msg.ts,
        threadTs: msg.thread_ts,
        user: {
          id: userId,
          name: userName,
          avatar: userAvatar,
        },
        reactions: msg.reactions?.map(r => ({
          name: r.name,
          count: r.count,
          users: r.users,
        })) || [],
      })
    }

    // Reverse to get oldest first
    messages.reverse()

    // Convert userMap to object for JSON response
    const userMapObj: Record<string, string> = {}
    userMap.forEach((name, id) => {
      userMapObj[id] = name
    })

    return NextResponse.json({
      messages,
      has_more: data.has_more || false,
      users: userMapObj,
    })

  } catch (error) {
    console.error('Error fetching Slack messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json(
      { error: 'Slack not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      )
    }

    // Get the user's name from session
    const userName = session.user?.name || session.user?.email || 'Anonym'

    // Post message to Slack
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `*${userName}:* ${text.trim()}`,
        unfurl_links: true,
        unfurl_media: true,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return NextResponse.json(
        { error: data.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ts: data.ts,
    })

  } catch (error) {
    console.error('Error sending Slack message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
