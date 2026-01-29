import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

/**
 * Proxy for Slack private file URLs.
 * Slack files (url_private, thumb_*) require authentication via bot token.
 * This route fetches the file with proper authorization and returns it.
 */
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
    const fileUrl = searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 })
    }

    // Validate that the URL is from Slack
    const url = new URL(fileUrl)
    if (!url.hostname.includes('slack') && !url.hostname.includes('slack-files.com')) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
    }

    // Fetch the file from Slack with bot token authorization
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch Slack file: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: response.status })
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    // Get the file content as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()

    // Return the file with proper headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Error proxying Slack file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
