import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID

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
    const { text, blocks, post_at, channel: channelParam } = body
    const channel = channelParam || SLACK_CHANNEL_ID

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    if (!post_at) {
      return NextResponse.json({ error: 'Scheduled time (post_at) is required' }, { status: 400 })
    }

    // post_at must be a Unix timestamp in the future (at least 1 minute from now)
    const now = Math.floor(Date.now() / 1000)
    const scheduledTime = typeof post_at === 'number' ? post_at : parseInt(post_at)

    if (scheduledTime <= now + 60) {
      return NextResponse.json(
        { error: 'Scheduled time must be at least 1 minute in the future' },
        { status: 400 }
      )
    }

    const userName = session.user?.name || session.user?.email || 'Anonym'
    const messageText = blocks ? text.trim() : `*${userName}:* ${text.trim()}`

    const payload: Record<string, unknown> = {
      channel,
      text: messageText,
      post_at: scheduledTime,
    }

    if (blocks && Array.isArray(blocks)) {
      payload.blocks = blocks
    }

    const response = await fetch('https://slack.com/api/chat.scheduleMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack schedule error:', data.error)
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduled_message_id: data.scheduled_message_id,
      post_at: data.post_at,
    })

  } catch (error) {
    console.error('Error scheduling message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// List scheduled messages
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
      `https://slack.com/api/chat.scheduledMessages.list?channel=${channel}`,
      {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      }
    )

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({
      scheduled_messages: data.scheduled_messages || [],
    })

  } catch (error) {
    console.error('Error listing scheduled messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete scheduled message
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
    const { scheduled_message_id, channel: channelParam } = body
    const channel = channelParam || SLACK_CHANNEL_ID

    if (!scheduled_message_id) {
      return NextResponse.json({ error: 'scheduled_message_id is required' }, { status: 400 })
    }

    const response = await fetch('https://slack.com/api/chat.deleteScheduledMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        scheduled_message_id,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting scheduled message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
