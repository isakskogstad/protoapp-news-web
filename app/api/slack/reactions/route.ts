import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's Slack access token from session
  const userToken = (session.user as Record<string, unknown>)?.slackAccessToken as string | undefined
  if (!userToken) {
    return NextResponse.json(
      { error: 'Slack user token not found. Please sign out and sign in again.' },
      { status: 401 }
    )
  }

  if (!SLACK_CHANNEL_ID) {
    return NextResponse.json(
      { error: 'Slack channel not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { timestamp, emoji } = body

    if (!timestamp || !emoji) {
      return NextResponse.json(
        { error: 'Timestamp and emoji are required' },
        { status: 400 }
      )
    }

    // Clean emoji name (remove colons if present)
    const cleanEmoji = emoji.replace(/:/g, '')

    // Add reaction using Slack API with user's token (so it shows as their reaction)
    const response = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        name: cleanEmoji,
        timestamp: timestamp,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      // "already_reacted" is not really an error
      if (data.error === 'already_reacted') {
        return NextResponse.json({ success: true, alreadyReacted: true })
      }
      console.error('Slack API error:', data.error)
      return NextResponse.json(
        { error: data.error || 'Failed to add reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error adding reaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's Slack access token from session
  const userToken = (session.user as Record<string, unknown>)?.slackAccessToken as string | undefined
  if (!userToken) {
    return NextResponse.json(
      { error: 'Slack user token not found. Please sign out and sign in again.' },
      { status: 401 }
    )
  }

  if (!SLACK_CHANNEL_ID) {
    return NextResponse.json(
      { error: 'Slack channel not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { timestamp, emoji } = body

    if (!timestamp || !emoji) {
      return NextResponse.json(
        { error: 'Timestamp and emoji are required' },
        { status: 400 }
      )
    }

    // Clean emoji name
    const cleanEmoji = emoji.replace(/:/g, '')

    // Remove reaction using Slack API with user's token (so it removes their reaction)
    const response = await fetch('https://slack.com/api/reactions.remove', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        name: cleanEmoji,
        timestamp: timestamp,
      }),
    })

    const data = await response.json()

    if (!data.ok && data.error !== 'no_reaction') {
      console.error('Slack API error:', data.error)
      return NextResponse.json(
        { error: data.error || 'Failed to remove reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error removing reaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
