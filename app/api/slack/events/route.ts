import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponseStreaming, getThreadHistory } from '@/lib/slack-ai'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

// Slack bot user ID (will be fetched once and cached)
let botUserId: string | null = null

async function getBotUserId(): Promise<string | null> {
  if (botUserId) return botUserId

  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` }
    })
    const data = await response.json()
    if (data.ok) {
      botUserId = data.user_id
      return botUserId
    }
  } catch (error) {
    console.error('Error getting bot user ID:', error)
  }
  return null
}

// Post a message to Slack and return the message timestamp
async function postMessage(channel: string, text: string, threadTs?: string): Promise<string | null> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text,
        thread_ts: threadTs,
        unfurl_links: false,
        unfurl_media: false,
      }),
    })
    const data = await response.json()
    return data.ok ? data.ts : null
  } catch (error) {
    console.error('Error posting message:', error)
    return null
  }
}

// Update an existing message
async function updateMessage(channel: string, messageTs: string, text: string): Promise<void> {
  try {
    await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ts: messageTs,
        text,
        unfurl_links: false,
        unfurl_media: false,
      }),
    })
  } catch (error) {
    console.error('Error updating message:', error)
  }
}

// Verify Slack request signature
async function verifySlackRequest(request: NextRequest, body: string): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) {
    console.warn('SLACK_SIGNING_SECRET not configured, skipping verification')
    return true
  }

  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')

  if (!timestamp || !signature) {
    return false
  }

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false
  }

  // Verify signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SLACK_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(sigBasestring))
  const computedSignature = 'v0=' + Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSignature === signature
}

// Handle the event
async function handleEvent(event: {
  type: string
  channel: string
  user?: string
  text?: string
  ts: string
  thread_ts?: string
  bot_id?: string
}): Promise<void> {
  console.log(`[Slack Event] Received: type=${event.type}, channel=${event.channel}, bot_id=${event.bot_id || 'none'}`)
  console.log(`[Slack Event] Text: "${event.text?.slice(0, 100) || 'none'}"`)

  // Ignore messages from bots (including ourselves)
  if (event.bot_id) {
    console.log('[Slack Event] Ignoring bot message')
    return
  }

  const botId = await getBotUserId()
  console.log(`[Slack Event] Our bot ID: ${botId}`)

  // Handle app_mention - someone @mentioned the bot
  if (event.type === 'app_mention' && event.text) {
    console.log('[Slack Event] Processing app_mention')

    // Remove the bot mention from the text
    const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim()
    console.log(`[Slack Event] Clean text: "${cleanText}"`)

    if (!cleanText) {
      console.log('[Slack Event] Empty text, sending default response')
      await postMessage(event.channel, 'Hej! Hur kan jag hjälpa dig? Fråga mig om bolag, protokoll, eller nyheter.', event.ts)
      return
    }

    // Check if Anthropic is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[Slack Event] ERROR: ANTHROPIC_API_KEY not configured')
      await postMessage(event.channel, '⚠️ AI är inte konfigurerad. ANTHROPIC_API_KEY saknas i miljövariabler.', event.ts)
      return
    }

    try {
      // Get thread history if in a thread
      const threadTs = event.thread_ts || event.ts
      const history = event.thread_ts && botId
        ? await getThreadHistory(event.channel, event.thread_ts, botId)
        : []

      console.log(`[Slack Event] Thread history: ${history.length} messages`)

      // Post initial message with typing indicator
      console.log('[Slack Event] Posting initial message...')
      const messageTs = await postMessage(event.channel, '⏳ Tänker...', threadTs)
      console.log(`[Slack Event] Initial message ts: ${messageTs}`)

      if (!messageTs) {
        console.log('[Slack Event] ERROR: Failed to post initial message')
        await postMessage(event.channel, '❌ Kunde inte starta svar', threadTs)
        return
      }

      // Generate AI response with streaming updates
      console.log('[Slack Event] Starting AI generation...')
      await generateAIResponseStreaming(cleanText, history, async (text, isComplete) => {
        console.log(`[Slack Event] AI update: complete=${isComplete}, length=${text.length}`)
        await updateMessage(event.channel, messageTs, isComplete ? text : text)
      })
      console.log('[Slack Event] AI generation complete')
    } catch (error) {
      console.error('[Slack Event] AI generation error:', error)
      await postMessage(event.channel, `❌ Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}`, event.ts)
    }
  }

  // Handle direct messages
  if (event.type === 'message' && event.channel?.startsWith('D') && event.text) {
    console.log('[Slack Event] Processing direct message')

    // Check if Anthropic is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[Slack Event] ERROR: ANTHROPIC_API_KEY not configured')
      await postMessage(event.channel, '⚠️ AI är inte konfigurerad. ANTHROPIC_API_KEY saknas i miljövariabler.', event.ts)
      return
    }

    try {
      // Get thread history if in a thread
      const threadTs = event.thread_ts || event.ts
      const history = event.thread_ts && botId
        ? await getThreadHistory(event.channel, event.thread_ts, botId)
        : []

      console.log(`[Slack Event] Thread history: ${history.length} messages`)

      // Post initial message with typing indicator
      console.log('[Slack Event] Posting initial message...')
      const messageTs = await postMessage(event.channel, '⏳ Tänker...', threadTs)
      console.log(`[Slack Event] Initial message ts: ${messageTs}`)

      if (!messageTs) {
        console.log('[Slack Event] ERROR: Failed to post initial message')
        await postMessage(event.channel, '❌ Kunde inte starta svar', threadTs)
        return
      }

      // Generate AI response with streaming updates
      console.log('[Slack Event] Starting AI generation...')
      await generateAIResponseStreaming(event.text, history, async (text, isComplete) => {
        console.log(`[Slack Event] AI update: complete=${isComplete}, length=${text.length}`)
        await updateMessage(event.channel, messageTs, isComplete ? text : text)
      })
      console.log('[Slack Event] AI generation complete')
    } catch (error) {
      console.error('[Slack Event] AI generation error:', error)
      await postMessage(event.channel, `❌ Ett fel uppstod: ${error instanceof Error ? error.message : 'Okänt fel'}`, event.ts)
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('[Slack API] POST request received')

  const body = await request.text()
  console.log(`[Slack API] Body length: ${body.length}`)

  // Verify request (optional but recommended)
  const isValid = await verifySlackRequest(request, body)
  if (!isValid) {
    console.log('[Slack API] ERROR: Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  console.log(`[Slack API] Payload type: ${payload.type}`)

  // Handle URL verification challenge
  if (payload.type === 'url_verification') {
    console.log('[Slack API] URL verification challenge')
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Handle events
  if (payload.type === 'event_callback') {
    const event = payload.event
    console.log(`[Slack API] Event callback: ${event.type}`)

    // Respond immediately to avoid Slack retries
    // Process event in background
    handleEvent(event).catch(error => {
      console.error('[Slack API] Error handling event:', error)
    })

    return NextResponse.json({ ok: true })
  }

  console.log('[Slack API] Unknown payload type, returning ok')
  return NextResponse.json({ ok: true })
}

// Also handle GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'LoopDesk Slack Events API',
    configured: {
      botToken: !!SLACK_BOT_TOKEN,
      signingSecret: !!SLACK_SIGNING_SECRET,
      anthropicKey: !!process.env.ANTHROPIC_API_KEY,
    }
  })
}
