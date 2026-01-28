import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { users } = body // Array of user IDs

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Users array is required' }, { status: 400 })
    }

    // Open or get existing conversation
    const response = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        users: users.join(','),
        return_im: true,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    const channel = data.channel
    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        isIm: channel.is_im,
        isMpim: channel.is_mpim,
        user: channel.user, // For 1:1 DMs
      },
    })

  } catch (error) {
    console.error('Error opening conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// List DM conversations
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    // Get IMs (direct messages)
    const imResponse = await fetch(
      'https://slack.com/api/conversations.list?types=im&exclude_archived=true&limit=50',
      {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      }
    )
    const imData = await imResponse.json()

    // Get MPIMs (group DMs)
    const mpimResponse = await fetch(
      'https://slack.com/api/conversations.list?types=mpim&exclude_archived=true&limit=50',
      {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      }
    )
    const mpimData = await mpimResponse.json()

    interface SlackConversation {
      id: string
      is_im: boolean
      is_mpim: boolean
      user?: string
      name?: string
      priority?: number
    }

    const conversations: Array<{
      id: string
      type: 'im' | 'mpim'
      userId?: string
      name?: string
    }> = []

    // Process IMs
    if (imData.ok && imData.channels) {
      for (const im of imData.channels as SlackConversation[]) {
        conversations.push({
          id: im.id,
          type: 'im',
          userId: im.user,
        })
      }
    }

    // Process MPIMs
    if (mpimData.ok && mpimData.channels) {
      for (const mpim of mpimData.channels as SlackConversation[]) {
        conversations.push({
          id: mpim.id,
          type: 'mpim',
          name: mpim.name,
        })
      }
    }

    return NextResponse.json({ conversations })

  } catch (error) {
    console.error('Error listing conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
