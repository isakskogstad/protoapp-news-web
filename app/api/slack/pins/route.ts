import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID

interface SlackPinnedItem {
  type: string
  message?: {
    ts: string
    text: string
    user?: string
    bot_id?: string
  }
  created: number
  created_by: string
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
    const channelParam = searchParams.get('channel')
    const channel = channelParam || SLACK_CHANNEL_ID

    const response = await fetch(
      `https://slack.com/api/pins.list?channel=${channel}`,
      {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      }
    )

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    // Filter to only message pins
    const pins = (data.items || [])
      .filter((item: SlackPinnedItem) => item.type === 'message' && item.message)
      .map((item: SlackPinnedItem) => ({
        timestamp: item.message!.ts,
        text: item.message!.text,
        userId: item.message!.user || null,
        pinnedAt: item.created,
        pinnedBy: item.created_by,
      }))

    return NextResponse.json({ pins })

  } catch (error) {
    console.error('Error fetching pinned messages:', error)
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
    const { timestamp, channel: channelParam } = body
    const channel = channelParam || SLACK_CHANNEL_ID

    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp is required' }, { status: 400 })
    }

    const response = await fetch('https://slack.com/api/pins.add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        timestamp,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error pinning message:', error)
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
    const { timestamp, channel: channelParam } = body
    const channel = channelParam || SLACK_CHANNEL_ID

    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp is required' }, { status: 400 })
    }

    const response = await fetch('https://slack.com/api/pins.remove', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        timestamp,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error unpinning message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
