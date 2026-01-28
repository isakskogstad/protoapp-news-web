import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// In-memory store for typing users (will reset on server restart)
// In production, you'd use Redis or a database
const typingUsers = new Map<string, { name: string; timestamp: number }>()

// Typing status expires after 5 seconds
const TYPING_TIMEOUT = 5000

// Clean up expired typing statuses
function cleanupTyping() {
  const now = Date.now()
  for (const [id, data] of typingUsers.entries()) {
    if (now - data.timestamp > TYPING_TIMEOUT) {
      typingUsers.delete(id)
    }
  }
}

// POST - Set typing status
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id?: string })?.id || session.user?.email || 'unknown'
  const userName = session.user?.name?.split(' ')[0] || 'Någon'

  // Update typing status
  typingUsers.set(userId, {
    name: userName,
    timestamp: Date.now(),
  })

  return NextResponse.json({ success: true })
}

// GET - Get typing users
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Clean up expired statuses
  cleanupTyping()

  const currentUserId = (session.user as { id?: string })?.id || session.user?.email || 'unknown'

  // Get list of typing users (excluding current user)
  const typing = Array.from(typingUsers.entries())
    .filter(([id]) => id !== currentUserId)
    .map(([, data]) => data.name)

  return NextResponse.json({ typingUsers: typing })
}
