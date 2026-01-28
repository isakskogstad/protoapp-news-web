import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface SlackPostMessageResponse {
  ok: boolean
  error?: string
  ts?: string
  channel?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const slackToken = (session.user as Record<string, unknown>).slackAccessToken as string | undefined

    if (!slackToken) {
      return NextResponse.json(
        { error: 'No Slack token available. Please re-login.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { channelId, message } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing channelId' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400 }
      )
    }

    // Send message using Slack Web API
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        ...message, // Contains blocks, text, etc.
      }),
    })

    const data: SlackPostMessageResponse = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data.error)

      // Handle specific errors
      if (data.error === 'channel_not_found') {
        return NextResponse.json(
          { error: 'Channel not found. You may not have access to this channel.' },
          { status: 404 }
        )
      }

      if (data.error === 'not_in_channel') {
        return NextResponse.json(
          { error: 'You are not a member of this channel.' },
          { status: 403 }
        )
      }

      if (data.error === 'missing_scope') {
        return NextResponse.json(
          { error: 'Missing Slack permissions. Please re-login.' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: `Slack API error: ${data.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ts: data.ts,
      channel: data.channel,
    })

  } catch (error) {
    console.error('Error sending Slack message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
