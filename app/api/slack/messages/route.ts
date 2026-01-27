import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID

interface SlackMessage {
  ts: string
  text: string
  user: string
  thread_ts?: string
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
    const limit = searchParams.get('limit') || '50'
    const oldest = searchParams.get('oldest') // Unix timestamp for pagination

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

    // Enrich messages with user info
    const messages = await Promise.all(
      (data.messages as SlackMessage[]).map(async (msg) => {
        const user = await getSlackUser(msg.user)
        return {
          id: msg.ts,
          text: msg.text,
          timestamp: msg.ts,
          user: {
            id: msg.user,
            name: user?.profile?.display_name || user?.real_name || user?.name || 'Unknown',
            avatar: user?.profile?.image_48 || null,
          },
        }
      })
    )

    // Reverse to get oldest first
    messages.reverse()

    return NextResponse.json({
      messages,
      has_more: data.has_more || false,
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
        unfurl_links: false,
        unfurl_media: false,
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
