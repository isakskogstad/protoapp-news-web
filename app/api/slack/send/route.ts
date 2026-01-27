import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl, message } = body

    if (!webhookUrl || !message) {
      return NextResponse.json(
        { error: 'Missing webhookUrl or message' },
        { status: 400 }
      )
    }

    // Validate webhook URL
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL' },
        { status: 400 }
      )
    }

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Slack webhook error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send to Slack', details: errorText },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Slack API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
