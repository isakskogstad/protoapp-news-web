import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated. Please login first.' }, { status: 401 })
    }

    const slackToken = (session.user as Record<string, unknown>).slackAccessToken as string | undefined

    if (!slackToken) {
      return NextResponse.json(
        { error: 'No Slack token available. Please re-login.' },
        { status: 401 }
      )
    }

    // Get channelId from query string or use default
    const url = new URL(request.url)
    const channelName = url.searchParams.get('channel') || 'redaktion'

    // First, find the channel ID
    const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200', {
      headers: {
        Authorization: `Bearer ${slackToken}`,
      },
    })

    const channelsData = await channelsResponse.json()

    if (!channelsData.ok) {
      return NextResponse.json({ error: `Failed to list channels: ${channelsData.error}` }, { status: 500 })
    }

    const channel = channelsData.channels?.find((c: { name: string }) => c.name === channelName)

    if (!channel) {
      return NextResponse.json({
        error: `Channel #${channelName} not found`,
        availableChannels: channelsData.channels?.map((c: { name: string }) => c.name).slice(0, 10)
      }, { status: 404 })
    }

    // Send test message
    const message = {
      channel: channel.id,
      text: '🧪 Testnotis från LoopDesk',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Testbolag AB',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ':bell: *TESTNOTIS - Slack-integration fungerar!*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Om du ser detta meddelande fungerar Slack-notiser korrekt. Nya bolagshändelser kommer nu att postas här automatiskt.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Testat av ${session.user.name || session.user.email} • ${new Date().toLocaleString('sv-SE')}`,
            },
          ],
        },
      ],
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({
        error: `Slack API error: ${data.error}`,
        hint: data.error === 'not_in_channel' ? 'You need to join the channel first' : undefined
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Test message sent to #${channelName}`,
      channel: channel.id,
      ts: data.ts,
    })

  } catch (error) {
    console.error('Test Slack error:', error)
    return NextResponse.json(
      { error: 'Failed to send test message', details: String(error) },
      { status: 500 }
    )
  }
}
