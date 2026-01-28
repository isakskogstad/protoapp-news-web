import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface SlackChannel {
  id: string
  name: string
  is_channel: boolean
  is_group: boolean
  is_private: boolean
  is_member: boolean
}

interface SlackConversationsResponse {
  ok: boolean
  channels?: SlackChannel[]
  error?: string
  response_metadata?: {
    next_cursor?: string
  }
}

export async function GET() {
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

    // Fetch channels the user is a member of
    const allChannels: { id: string; name: string; isPrivate: boolean }[] = []
    let cursor: string | undefined

    do {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel',
        exclude_archived: 'true',
        limit: '200',
      })

      if (cursor) {
        params.append('cursor', cursor)
      }

      const response = await fetch(
        `https://slack.com/api/conversations.list?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${slackToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data: SlackConversationsResponse = await response.json()

      if (!data.ok) {
        console.error('Slack API error:', data.error)

        // Handle specific errors
        if (data.error === 'missing_scope') {
          return NextResponse.json(
            { error: 'Missing Slack permissions. Please re-login to grant channel access.' },
            { status: 403 }
          )
        }

        return NextResponse.json(
          { error: `Slack API error: ${data.error}` },
          { status: 500 }
        )
      }

      // Filter to only channels user is member of
      const memberChannels = (data.channels || [])
        .filter(ch => ch.is_member)
        .map(ch => ({
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private || ch.is_group,
        }))

      allChannels.push(...memberChannels)
      cursor = data.response_metadata?.next_cursor

    } while (cursor)

    // Sort alphabetically
    allChannels.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ channels: allChannels })

  } catch (error) {
    console.error('Error fetching Slack channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}
