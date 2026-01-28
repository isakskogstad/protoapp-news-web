import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

// Cache for presence data (TTL: 60 seconds)
const presenceCache = new Map<string, { presence: string; timestamp: number }>()
const PRESENCE_CACHE_TTL = 60000 // 1 minute

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const userIds = searchParams.get('users')?.split(',').filter(Boolean) || []

    if (userIds.length === 0) {
      return NextResponse.json({ presence: {} })
    }

    const now = Date.now()
    const presenceMap: Record<string, string> = {}
    const usersToFetch: string[] = []

    // Check cache first
    for (const userId of userIds) {
      const cached = presenceCache.get(userId)
      if (cached && now - cached.timestamp < PRESENCE_CACHE_TTL) {
        presenceMap[userId] = cached.presence
      } else {
        usersToFetch.push(userId)
      }
    }

    // Fetch presence for users not in cache (limit to 10 concurrent requests)
    const batchSize = 10
    for (let i = 0; i < usersToFetch.length; i += batchSize) {
      const batch = usersToFetch.slice(i, i + batchSize)

      await Promise.all(batch.map(async (userId) => {
        try {
          const response = await fetch(
            `https://slack.com/api/users.getPresence?user=${userId}`,
            {
              headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
            }
          )
          const data = await response.json()

          if (data.ok) {
            const presence = data.presence // 'active' or 'away'
            presenceMap[userId] = presence
            presenceCache.set(userId, { presence, timestamp: now })
          }
        } catch (error) {
          console.error(`Error fetching presence for ${userId}:`, error)
        }
      }))
    }

    return NextResponse.json({ presence: presenceMap })

  } catch (error) {
    console.error('Error fetching presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
