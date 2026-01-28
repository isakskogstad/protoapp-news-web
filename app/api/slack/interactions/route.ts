import { NextRequest, NextResponse } from 'next/server'

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

// Verify Slack request signature
async function verifySlackSignature(
  timestamp: string,
  signature: string,
  body: string
): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) return false

  const sigBaseString = `v0:${timestamp}:${body}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SLACK_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(sigBaseString)
  )

  const computedSignature = 'v0=' + Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSignature === signature
}

interface SlackInteractionPayload {
  type: string
  user: {
    id: string
    username: string
    name: string
  }
  channel: {
    id: string
    name: string
  }
  message?: {
    ts: string
    text: string
  }
  actions?: Array<{
    type: string
    action_id: string
    block_id?: string
    value?: string
    text?: {
      type: string
      text: string
    }
  }>
  trigger_id: string
  response_url: string
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify request is from Slack (optional but recommended)
    const timestamp = request.headers.get('x-slack-request-timestamp')
    const signature = request.headers.get('x-slack-signature')

    if (SLACK_SIGNING_SECRET && timestamp && signature) {
      const isValid = await verifySlackSignature(timestamp, signature, rawBody)
      if (!isValid) {
        console.warn('Invalid Slack signature')
        // Continue anyway for development - in production you might want to return 401
      }
    }

    // Parse the payload
    const params = new URLSearchParams(rawBody)
    const payloadString = params.get('payload')

    if (!payloadString) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 })
    }

    const payload: SlackInteractionPayload = JSON.parse(payloadString)

    // Handle different interaction types
    switch (payload.type) {
      case 'block_actions':
        // Handle button clicks, select menus, etc.
        const actions = payload.actions || []

        for (const action of actions) {
          console.log('Block action received:', {
            actionId: action.action_id,
            value: action.value,
            userId: payload.user.id,
            channelId: payload.channel.id,
          })

          // Handle specific actions
          // Example: if (action.action_id === 'mark_read') { ... }

          // You can respond to the action by posting to response_url
          // This updates the original message
          if (payload.response_url) {
            // Example: acknowledge the action
            await fetch(payload.response_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                replace_original: false,
                text: `Åtgärd utförd av <@${payload.user.id}>`,
              }),
            })
          }
        }

        // Return empty 200 to acknowledge
        return new NextResponse(null, { status: 200 })

      case 'message_action':
        // Handle message shortcuts
        console.log('Message action:', payload)
        return new NextResponse(null, { status: 200 })

      case 'shortcut':
        // Handle global shortcuts
        console.log('Shortcut:', payload)
        return new NextResponse(null, { status: 200 })

      case 'view_submission':
        // Handle modal submissions
        console.log('View submission:', payload)
        return new NextResponse(null, { status: 200 })

      case 'view_closed':
        // Handle modal closed
        console.log('View closed:', payload)
        return new NextResponse(null, { status: 200 })

      default:
        console.log('Unknown interaction type:', payload.type)
        return new NextResponse(null, { status: 200 })
    }

  } catch (error) {
    console.error('Error handling Slack interaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
