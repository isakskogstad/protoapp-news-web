import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const initialComment = formData.get('comment') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const userName = session.user?.name || session.user?.email || 'Anonym'

    // Step 1: Get upload URL from Slack
    const getUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        filename: file.name,
        length: String(file.size),
      }),
    })

    const urlData = await getUrlResponse.json()

    if (!urlData.ok) {
      console.error('Failed to get upload URL:', urlData.error)
      return NextResponse.json({ error: urlData.error }, { status: 500 })
    }

    const { upload_url, file_id } = urlData

    // Step 2: Upload file to the URL
    const fileBuffer = await file.arrayBuffer()

    const uploadResponse = await fetch(upload_url, {
      method: 'POST',
      body: fileBuffer,
    })

    if (!uploadResponse.ok) {
      console.error('Failed to upload file')
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Step 3: Complete the upload and share to channel
    const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [{ id: file_id, title: file.name }],
        channel_id: SLACK_CHANNEL_ID,
        initial_comment: initialComment ? `*${userName}:* ${initialComment}` : `*${userName}* laddade upp en fil`,
      }),
    })

    const completeData = await completeResponse.json()

    if (!completeData.ok) {
      console.error('Failed to complete upload:', completeData.error)
      return NextResponse.json({ error: completeData.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: completeData.files?.[0] || { id: file_id, name: file.name },
    })

  } catch (error) {
    console.error('Error uploading file to Slack:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
