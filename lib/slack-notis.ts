import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from './supabase'

let anthropicClient: Anthropic | null = null

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return anthropicClient
}

export interface NotisResult {
  success: boolean
  rubrik?: string
  ingress?: string
  brodtext?: string
  faktaruta?: Record<string, string>
  error?: string
}

// Generate a publication-ready news notice for a company
export async function generateNotis(orgNumber: string): Promise<NotisResult> {
  const supabase = createServerClient()

  // Format org number
  const cleanOrg = orgNumber.replace(/-/g, '')
  const formattedOrg = cleanOrg.length === 10
    ? `${cleanOrg.slice(0, 6)}-${cleanOrg.slice(6)}`
    : orgNumber

  // Fetch all relevant data
  const [protocolResult, kungorelseResult, companyResult] = await Promise.all([
    // Latest protocol
    supabase
      .from('ProtocolAnalysis')
      .select('*')
      .eq('org_number', formattedOrg)
      .order('protocol_date', { ascending: false })
      .limit(1)
      .single(),
    // Latest kungörelse
    supabase
      .from('Kungorelser')
      .select('*')
      .eq('org_number', cleanOrg)
      .order('publicerad', { ascending: false })
      .limit(1)
      .single(),
    // Company info
    supabase
      .from('LoopBrowse_Protokoll')
      .select('*')
      .eq('orgnummer', formattedOrg)
      .single()
  ])

  const protocol = protocolResult.data
  const kungorelse = kungorelseResult.data
  const company = companyResult.data

  if (!protocol && !kungorelse) {
    return { success: false, error: 'Ingen data hittades för detta bolag' }
  }

  // Build context for Claude
  let context = `## BOLAGSDATA\n`

  if (company) {
    context += `
Bolag: ${company.namn}
Org.nr: ${company.orgnummer}
VD: ${company.vd || 'Ej angivet'}
Ordförande: ${company.ordforande || 'Ej angivet'}
Största ägare: ${company.storsta_agare || 'Ej angivet'}
Stad: ${company.stad || 'Ej angivet'}
Anställda: ${company.anstallda || 'Ej angivet'}
Omsättning: ${company.omsattning || 'Ej angivet'}
`
  }

  if (protocol) {
    context += `
## SENASTE PROTOKOLL
Typ: ${protocol.protocol_type}
Datum: ${protocol.protocol_date}
`
    if (protocol.extracted_data) {
      context += `Extraherad data: ${JSON.stringify(protocol.extracted_data, null, 2)}\n`
    }
    if (protocol.signals) {
      context += `Signaler: ${JSON.stringify(protocol.signals, null, 2)}\n`
    }
    if (protocol.calculations) {
      context += `Beräkningar: ${JSON.stringify(protocol.calculations, null, 2)}\n`
    }
  }

  if (kungorelse) {
    context += `
## SENASTE KUNGÖRELSE
Typ: ${kungorelse.typ}
Kategori: ${kungorelse.kategori}
Publicerad: ${kungorelse.publicerad}
Rubrik: ${kungorelse.rubrik || 'Ej angivet'}
Text: ${kungorelse.kungorelsetext || 'Ej angivet'}
`
  }

  // Generate notis with Claude
  const client = getAnthropic()

  const prompt = `Du är en erfaren affärsjournalist. Skriv en publiceringsredo nyhetsnotis baserat på denna bolagsdata.

${context}

Skriv notisen i följande JSON-format:
{
  "rubrik": "Max 70 tecken, aktivt verb, viktigaste först",
  "ingress": "En mening som svarar på vem, vad, när, var",
  "brodtext": "2-3 stycken med detaljer, viktigast först",
  "faktaruta": {
    "Bolag": "Namn",
    "Org.nr": "XXXXXX-XXXX",
    "Händelse": "Typ av händelse",
    "Datum": "YYYY-MM-DD",
    "Belopp": "Om relevant",
    "VD": "Om relevant"
  }
}

VIKTIGT:
- Skriv på svenska
- Var saklig och neutral
- Inkludera endast fakta från datan
- Faktarutan ska bara innehålla relevanta fält
- Returnera ENDAST JSON, ingen annan text`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || !('text' in textBlock)) {
      return { success: false, error: 'Kunde inte generera notis' }
    }

    // Parse JSON from response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: 'Kunde inte tolka AI-svaret' }
    }

    const notis = JSON.parse(jsonMatch[0])

    return {
      success: true,
      rubrik: notis.rubrik,
      ingress: notis.ingress,
      brodtext: notis.brodtext,
      faktaruta: notis.faktaruta
    }
  } catch (error) {
    console.error('Error generating notis:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Okänt fel' }
  }
}

// Format notis for Slack
export function formatNotisForSlack(notis: NotisResult): unknown[] {
  if (!notis.success) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Fel:* ${notis.error}`
        }
      }
    ]
  }

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📰 Genererad nyhetsnotis'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${notis.rubrik}*`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_${notis.ingress}_`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: notis.brodtext
      }
    }
  ]

  // Add faktaruta
  if (notis.faktaruta && Object.keys(notis.faktaruta).length > 0) {
    const faktaText = Object.entries(notis.faktaruta)
      .map(([key, value]) => `*${key}:* ${value}`)
      .join('\n')

    blocks.push(
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📋 *Faktaruta*\n${faktaText}`
        }
      }
    )
  }

  // Add action buttons
  blocks.push(
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📋 Kopiera text'
          },
          action_id: 'copy_notis'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 Generera graf'
          },
          action_id: 'generate_chart'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔄 Regenerera'
          },
          action_id: 'regenerate_notis'
        }
      ]
    }
  )

  return blocks
}

// Get plain text version for copying
export function getNotisPlainText(notis: NotisResult): string {
  if (!notis.success) return ''

  let text = `${notis.rubrik}\n\n`
  text += `${notis.ingress}\n\n`
  text += `${notis.brodtext}\n\n`

  if (notis.faktaruta) {
    text += `FAKTARUTA\n`
    Object.entries(notis.faktaruta).forEach(([key, value]) => {
      text += `${key}: ${value}\n`
    })
  }

  return text
}
