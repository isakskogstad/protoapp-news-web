import { NextRequest, NextResponse } from 'next/server'
import { botClient, isBotConfigured, CHANNEL_ID, withRetry } from '@/lib/slack-client'

interface ShareFileRequest {
  url: string
  title: string
  channel?: string
  filetype?: string
}

interface RemoteFileResponse {
  ok: boolean
  file?: {
    id: string
    external_id: string
    title: string
    external_url: string
    url_private?: string
    permalink?: string
  }
  error?: string
}

/**
 * Share a remote file (e.g., PDF from Supabase Storage) to Slack
 *
 * This uses Slack's files.remote.add and files.remote.share APIs to:
 * 1. Register the external file URL with Slack
 * 2. Share it to a specified channel
 *
 * The file remains hosted externally (Supabase Storage) - Slack just creates
 * a reference to it with preview capabilities.
 */
export async function POST(request: NextRequest) {
  if (!isBotConfigured()) {
    return NextResponse.json(
      { error: 'Slack bot not configured' },
      { status: 500 }
    )
  }

  try {
    const body: ShareFileRequest = await request.json()
    const { url, title, channel, filetype } = body

    // Validate required fields
    if (!url || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: url and title are required' },
        { status: 400 }
      )
    }

    // Validate URL format (should be a valid URL, typically from Supabase Storage)
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Determine the channel to share to
    const targetChannel = channel || CHANNEL_ID
    if (!targetChannel) {
      return NextResponse.json(
        { error: 'No channel specified and no default channel configured' },
        { status: 400 }
      )
    }

    // Generate a unique external_id for this file
    // Using timestamp + hash of URL for uniqueness
    const externalId = `pdf-${Date.now()}-${hashCode(url)}`

    // Step 1: Register the remote file with Slack
    const addResult = await withRetry(async () => {
      const response = await botClient.files.remote.add({
        external_id: externalId,
        external_url: url,
        title: title,
        filetype: filetype || detectFiletype(url),
      }) as RemoteFileResponse

      if (!response.ok) {
        throw new Error(response.error || 'Failed to add remote file')
      }

      return response
    }, 'files.remote.add')

    if (!addResult.file) {
      return NextResponse.json(
        { error: 'Failed to register remote file with Slack' },
        { status: 500 }
      )
    }

    const fileId = addResult.file.id

    // Step 2: Share the file to the channel
    const shareResult = await withRetry(async () => {
      const response = await botClient.files.remote.share({
        file: fileId,
        channels: targetChannel,
      }) as RemoteFileResponse

      if (!response.ok) {
        throw new Error(response.error || 'Failed to share remote file')
      }

      return response
    }, 'files.remote.share')

    // Return success with file info
    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        externalId: externalId,
        title: title,
        url: url,
        channel: targetChannel,
        permalink: shareResult.file?.permalink,
      },
    })

  } catch (error) {
    console.error('Error sharing file to Slack:', error)

    // Handle specific Slack API errors
    if (error instanceof Error) {
      const errorMessage = error.message

      // Common Slack API errors
      if (errorMessage.includes('channel_not_found')) {
        return NextResponse.json(
          { error: 'Channel not found. Check channel ID or invite the bot.' },
          { status: 404 }
        )
      }
      if (errorMessage.includes('not_in_channel')) {
        return NextResponse.json(
          { error: 'Bot is not a member of the channel. Please invite the bot first.' },
          { status: 403 }
        )
      }
      if (errorMessage.includes('invalid_external_id')) {
        return NextResponse.json(
          { error: 'Invalid external ID format' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Simple hash function for generating unique IDs
 */
function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Detect filetype from URL extension
 */
function detectFiletype(url: string): string {
  const urlObj = new URL(url)
  const path = urlObj.pathname.toLowerCase()

  if (path.endsWith('.pdf')) return 'pdf'
  if (path.endsWith('.doc') || path.endsWith('.docx')) return 'doc'
  if (path.endsWith('.xls') || path.endsWith('.xlsx')) return 'xls'
  if (path.endsWith('.png')) return 'png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'jpg'
  if (path.endsWith('.gif')) return 'gif'

  // Default to binary for unknown types
  return 'binary'
}
