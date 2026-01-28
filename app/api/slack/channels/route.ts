import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  is_archived: boolean
  is_member: boolean
  num_members: number
  topic: { value: string }
  purpose: { value: string }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    // Fetch public channels
    const publicResponse = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel&exclude_archived=true&limit=100',
      {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      }
    )
    const publicData = await publicResponse.json()

    // Fetch private channels (bot must be a member)
    const privateResponse = await fetch(
      'https://slack.com/api/conversations.list?types=private_channel&exclude_archived=true&limit=100',
      {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      }
    )
    const privateData = await privateResponse.json()

    const allChannels: SlackChannel[] = [
      ...(publicData.channels || []),
      ...(privateData.channels || []),
    ]

    // Filter to only channels where bot is a member
    const memberChannels = allChannels.filter((ch: SlackChannel) => ch.is_member)

    const channels = memberChannels.map((ch: SlackChannel) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
      topic: ch.topic?.value || '',
      purpose: ch.purpose?.value || '',
      memberCount: ch.num_members,
    }))

    // Sort alphabetically
    channels.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ channels })

  } catch (error) {
    console.error('Error fetching Slack channels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
