import { NextRequest, NextResponse } from 'next/server'
import { generateNotis, formatNotisForSlack, getNotisPlainText } from '@/lib/slack-notis'
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '@/lib/slack-watchlist'
import {
  generateEmissionChart,
  generateKungorelseChart,
  generateProtocolTypeChart,
  generateCompanyEmissionChart,
  sendChartToSlack
} from '@/lib/slack-charts'
import { createServerClient } from '@/lib/supabase'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

// Send response to Slack
async function sendSlackResponse(
  responseUrl: string,
  blocks: unknown[],
  text: string,
  responseType: 'ephemeral' | 'in_channel' = 'in_channel'
): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response_type: responseType,
      blocks,
      text
    })
  })
}

// Handle /notis command
async function handleNotisCommand(
  orgNumber: string,
  responseUrl: string,
  channelId: string
): Promise<void> {
  // Send immediate "working" response
  await sendSlackResponse(
    responseUrl,
    [{ type: 'section', text: { type: 'mrkdwn', text: '⏳ Genererar nyhetsnotis...' } }],
    'Genererar notis...',
    'ephemeral'
  )

  const notis = await generateNotis(orgNumber)
  const blocks = formatNotisForSlack(notis)

  // Post the notis to the channel
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: channelId,
      blocks,
      text: notis.success ? notis.rubrik : 'Kunde inte generera notis'
    })
  })

  // Also provide copyable text in thread
  if (notis.success) {
    const plainText = getNotisPlainText(notis)
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        text: `\`\`\`\n${plainText}\n\`\`\``,
        unfurl_links: false
      })
    })
  }
}

// Handle /bevaka command
async function handleBevakaCommand(
  args: string,
  userId: string,
  channelId: string,
  responseUrl: string
): Promise<void> {
  const parts = args.trim().split(/\s+/)
  const action = parts[0]?.toLowerCase()
  const orgNumber = parts[1]

  if (action === 'lista' || !action) {
    // List watchlist
    const watchlist = await getWatchlist(userId)

    if (watchlist.length === 0) {
      await sendSlackResponse(
        responseUrl,
        [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📋 Du har inga bevakade bolag.\n\nAnvänd `/bevaka lägg 556123-4567` för att lägga till ett bolag.'
          }
        }],
        'Ingen bevakning',
        'ephemeral'
      )
      return
    }

    const listText = watchlist
      .map((w, i) => `${i + 1}. *${w.company_name}* (${w.org_number})`)
      .join('\n')

    await sendSlackResponse(
      responseUrl,
      [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📋 *Dina bevakade bolag:*\n\n${listText}`
        }
      }],
      'Bevakningslista',
      'ephemeral'
    )
    return
  }

  if (action === 'lägg' || action === 'add') {
    if (!orgNumber) {
      await sendSlackResponse(
        responseUrl,
        [{ type: 'section', text: { type: 'mrkdwn', text: '❌ Ange org.nummer: `/bevaka lägg 556123-4567`' } }],
        'Fel',
        'ephemeral'
      )
      return
    }

    // Look up company name
    const supabase = createServerClient()
    const cleanOrg = orgNumber.replace(/-/g, '')
    const formattedOrg = cleanOrg.length === 10
      ? `${cleanOrg.slice(0, 6)}-${cleanOrg.slice(6)}`
      : orgNumber

    const { data: company } = await supabase
      .from('LoopBrowse_Protokoll')
      .select('namn')
      .eq('orgnummer', formattedOrg)
      .single()

    const companyName = company?.namn || 'Okänt bolag'

    const result = await addToWatchlist(userId, channelId, orgNumber, companyName)

    if (result.success) {
      await sendSlackResponse(
        responseUrl,
        [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *${companyName}* (${formattedOrg}) är nu bevakad!\n\nDu får notis här när nya protokoll eller kungörelser publiceras.`
          }
        }],
        'Bevakning tillagd',
        'ephemeral'
      )
    } else {
      await sendSlackResponse(
        responseUrl,
        [{ type: 'section', text: { type: 'mrkdwn', text: `❌ ${result.error}` } }],
        'Fel',
        'ephemeral'
      )
    }
    return
  }

  if (action === 'ta' || action === 'remove' || action === 'bort') {
    const targetOrg = parts[1] === 'bort' ? parts[2] : orgNumber

    if (!targetOrg) {
      await sendSlackResponse(
        responseUrl,
        [{ type: 'section', text: { type: 'mrkdwn', text: '❌ Ange org.nummer: `/bevaka ta bort 556123-4567`' } }],
        'Fel',
        'ephemeral'
      )
      return
    }

    const result = await removeFromWatchlist(userId, targetOrg)

    if (result.success) {
      await sendSlackResponse(
        responseUrl,
        [{ type: 'section', text: { type: 'mrkdwn', text: `✅ Bevakning borttagen för ${targetOrg}` } }],
        'Bevakning borttagen',
        'ephemeral'
      )
    } else {
      await sendSlackResponse(
        responseUrl,
        [{ type: 'section', text: { type: 'mrkdwn', text: `❌ ${result.error}` } }],
        'Fel',
        'ephemeral'
      )
    }
    return
  }

  // Unknown action - show help
  await sendSlackResponse(
    responseUrl,
    [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📋 *Bevakningskommandon:*\n
• \`/bevaka\` eller \`/bevaka lista\` - Visa dina bevakade bolag
• \`/bevaka lägg 556123-4567\` - Lägg till bevakning
• \`/bevaka ta bort 556123-4567\` - Ta bort bevakning`
      }
    }],
    'Hjälp',
    'ephemeral'
  )
}

// Handle /graf command
async function handleGrafCommand(
  args: string,
  channelId: string,
  responseUrl: string
): Promise<void> {
  const parts = args.trim().split(/\s+/)
  const chartType = parts[0]?.toLowerCase()

  await sendSlackResponse(
    responseUrl,
    [{ type: 'section', text: { type: 'mrkdwn', text: '📊 Genererar graf...' } }],
    'Genererar...',
    'ephemeral'
  )

  let chartResult: { url: string; title: string } | null = null

  switch (chartType) {
    case 'emissioner':
    case 'emission':
      chartResult = await generateEmissionChart(parseInt(parts[1]) || 90)
      break

    case 'kungörelser':
    case 'kungorelser':
      chartResult = await generateKungorelseChart(parseInt(parts[1]) || 30)
      break

    case 'protokoll':
      chartResult = await generateProtocolTypeChart(parseInt(parts[1]) || 90)
      break

    case 'bolag':
      if (parts[1]) {
        chartResult = await generateCompanyEmissionChart(parts[1])
      }
      break

    default:
      await sendSlackResponse(
        responseUrl,
        [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📊 *Tillgängliga grafer:*\n
• \`/graf emissioner [dagar]\` - Emissionstrend
• \`/graf kungörelser [dagar]\` - Kungörelsefördelning
• \`/graf protokoll [dagar]\` - Protokolltyper
• \`/graf bolag 556123-4567\` - Bolagets emissionshistorik`
          }
        }],
        'Hjälp',
        'ephemeral'
      )
      return
  }

  if (chartResult) {
    await sendChartToSlack(channelId, chartResult.url, chartResult.title)
  } else {
    await sendSlackResponse(
      responseUrl,
      [{ type: 'section', text: { type: 'mrkdwn', text: '❌ Kunde inte generera graf - ingen data hittades' } }],
      'Fel',
      'ephemeral'
    )
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  const command = formData.get('command') as string
  const text = formData.get('text') as string || ''
  const userId = formData.get('user_id') as string
  const channelId = formData.get('channel_id') as string
  const responseUrl = formData.get('response_url') as string

  // Acknowledge immediately (Slack requires response within 3s)
  const immediateResponse = NextResponse.json({ response_type: 'ephemeral' })

  // Process command in background
  switch (command) {
    case '/notis':
      handleNotisCommand(text.trim(), responseUrl, channelId).catch(console.error)
      break

    case '/bevaka':
      handleBevakaCommand(text, userId, channelId, responseUrl).catch(console.error)
      break

    case '/graf':
      handleGrafCommand(text, channelId, responseUrl).catch(console.error)
      break

    default:
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `Okänt kommando: ${command}`
      })
  }

  return immediateResponse
}
