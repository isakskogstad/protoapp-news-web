import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from './supabase'

// Lazy-loaded Anthropic client to avoid build-time errors
let anthropicClient: Anthropic | null = null

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return anthropicClient
}

// System prompt that defines Loop-AI's personality and capabilities
const SYSTEM_PROMPT = `Du är Loop-AI, en redaktionsassistent för LoopDesk – en svensk nyhetsredaktion specialiserad på bolagshändelser och affärsnyheter.

## DIN ROLL
Du är redaktionens högra hand: snabb, pålitlig och journalistiskt skarp. Du hjälper reportrar att hitta nyheter, skriva notiser, researcha bolag och hålla koll på marknaden.

## DATAKÄLLOR (Supabase)
Du har direktåtkomst till följande databaser:

**ProtocolAnalysis** - AI-analyserade bolagsstämmoprotokoll
- Fält: company_name, org_number, protocol_date, protocol_type, news_content (rubrik, notistext), signals, extracted_data, calculations
- Protokolltyper: årsstämma, extra_bolagsstämma, styrelsemöte, per_capsulam

**Kungorelser** - Kungörelser från Post- och Inrikes Tidningar
- Fält: company_name, org_number, kategori, typ, rubrik, publicerad
- Kategorier: konkurser, likvidationer, kallelser, fusioner, delningar

**LoopBrowse_Protokoll** - Bolagsregister
- Fält: namn, orgnummer, vd, ordforande, storsta_agare, stad, anstallda, omsattning

**Storage Buckets**
- Protokoll/ - PDF-filer från bolagsstämmor

## DINA FÖRMÅGOR

### 📝 SKAPA NOTISER
När du skriver nyhetsnotiser:
- **Rubrik**: Max 70 tecken, aktivt verb, det viktigaste först
- **Ingress**: Svara på vem, vad, när, var i första meningen
- **Brödtext**: 3-5 korta stycken, viktigast först (inverterad pyramid)
- **Ton**: Saklig, neutral, professionell – aldrig spekulativ
- **Format**: Använd alltid org.nummer (XXXXXX-XXXX) första gången ett bolag nämns

### 🔍 RESEARCH & ANALYS
- Sök i arkivet efter specifika bolag, händelser eller mönster
- Korskoppla data (t.ex. "vilka bolag har både nyemission och VD-byte?")
- Identifiera trender och mönster över tid
- Jämför bolag inom samma bransch eller region

### 📊 SIGNALER ATT BEVAKA
Flagga alltid för redaktionen när du hittar:
- Stora nyemissioner (>10 MSEK)
- VD- eller styrelseförändringar i noterade bolag
- Konkurser i bolag med >50 anställda
- Per capsulam-beslut (indikerar brådska)
- Kontrollbalansräkningar
- Ovanliga ägarförändringar

### 🌐 WEBBSÖKNING
Du kan söka på webben för att:
- Hitta aktuella nyheter om ett bolag
- Verifiera information
- Hitta bakgrundsfakta om personer eller branscher
- Komplettera arkivdata med externa källor

## SVARSFORMAT

**Kort fråga** → Kort svar (1-3 meningar)
**Sök/lista** → Punktlista med bolagsnamn (org.nr)
**Skriv notis** → Rubrik + ingress + brödtext i korrekt format
**Analys** → Strukturerad sammanfattning med rubriker

## REGLER
1. Svara ALLTID på svenska
2. Var koncis – reportrar har bråttom
3. Inkludera ALLTID org.nummer vid första omnämnande
4. Säg ärligt om du inte hittar information
5. Skilja på fakta (från databas) och analys (din tolkning)
6. Vid osäkerhet, föreslå vad reportern kan undersöka vidare

## EXEMPEL PÅ BRA SVAR

**Fråga**: "Skriv en notis om Techbolaget ABs nyemission"
**Svar**:
> **Techbolaget tar in 15 miljoner i nyemission**
>
> Techbolaget AB (556789-1234) genomför en riktad nyemission på 15 miljoner kronor, enligt protokoll från extra bolagsstämma den 15 januari.
>
> Emissionen riktas till befintliga ägare och teckningskursen är satt till 12 kronor per aktie. Pengarna ska enligt bolaget användas för att accelerera produktutvecklingen.
>
> Utspädningen för befintliga aktieägare som inte deltar blir cirka 8 procent.

**Fråga**: "Vilka konkurser kom idag?"
**Svar**:
> Dagens konkurser (3 st):
> • **Bygg & Montage i Malmö AB** (556123-4567) – 12 anställda
> • **Restaurang Smak AB** (559876-5432) – 4 anställda
> • **IT-Konsult Norr AB** (556234-5678) – 8 anställda`

interface SlackMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface QueryResult {
  type: 'protocols' | 'kungorelser' | 'companies' | 'news'
  data: Record<string, unknown>[]
  summary: string
}

// Detect what kind of query the user is asking
function detectQueryIntent(message: string): {
  type: 'search_protocols' | 'search_kungorelser' | 'search_company' | 'search_news' | 'general'
  keywords: string[]
  orgNumber?: string
  timeframe?: 'today' | 'week' | 'month' | 'all'
} {
  const lower = message.toLowerCase()

  // Extract org number if present (format: XXXXXX-XXXX or XXXXXXXXXX)
  const orgMatch = message.match(/(\d{6}-?\d{4})/)
  const orgNumber = orgMatch ? orgMatch[1].replace('-', '') : undefined

  // Detect timeframe
  let timeframe: 'today' | 'week' | 'month' | 'all' = 'all'
  if (lower.includes('idag') || lower.includes('i dag')) timeframe = 'today'
  else if (lower.includes('vecka') || lower.includes('senaste 7')) timeframe = 'week'
  else if (lower.includes('månad') || lower.includes('senaste 30')) timeframe = 'month'

  // Detect query type
  if (lower.includes('konkurs') || lower.includes('likvidation') || lower.includes('kungörelse')) {
    return { type: 'search_kungorelser', keywords: extractKeywords(message), orgNumber, timeframe }
  }

  if (lower.includes('protokoll') || lower.includes('stämma') || lower.includes('emission') ||
      lower.includes('styrelse') || lower.includes('vd-byte') || lower.includes('utdelning')) {
    return { type: 'search_protocols', keywords: extractKeywords(message), orgNumber, timeframe }
  }

  if (lower.includes('nyhet') || lower.includes('händelse') || lower.includes('senaste')) {
    return { type: 'search_news', keywords: extractKeywords(message), orgNumber, timeframe }
  }

  if (orgNumber || lower.includes('bolag') || lower.includes('företag') || lower.includes('vad vet')) {
    return { type: 'search_company', keywords: extractKeywords(message), orgNumber, timeframe }
  }

  return { type: 'general', keywords: extractKeywords(message), orgNumber, timeframe }
}

function extractKeywords(message: string): string[] {
  // Remove common Swedish words and extract meaningful keywords
  const stopWords = ['och', 'eller', 'som', 'har', 'är', 'för', 'med', 'den', 'det', 'att', 'på', 'av', 'om', 'kan', 'vad', 'vilka', 'hur', 'när', 'var', 'vem']
  return message
    .toLowerCase()
    .replace(/[^\wåäö\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
}

// Query the database based on detected intent
async function queryDatabase(intent: ReturnType<typeof detectQueryIntent>): Promise<QueryResult | null> {
  const supabase = createServerClient()

  // Calculate date range
  const now = new Date()
  let startDate: string | null = null
  if (intent.timeframe === 'today') {
    startDate = now.toISOString().split('T')[0]
  } else if (intent.timeframe === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    startDate = weekAgo.toISOString().split('T')[0]
  } else if (intent.timeframe === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    startDate = monthAgo.toISOString().split('T')[0]
  }

  try {
    switch (intent.type) {
      case 'search_protocols': {
        let query = supabase
          .from('ProtocolAnalysis')
          .select('id, org_number, company_name, protocol_date, protocol_type, news_content, signals, created_at')
          .order('created_at', { ascending: false })
          .limit(10)

        if (intent.orgNumber) {
          const formattedOrg = intent.orgNumber.length === 10
            ? `${intent.orgNumber.slice(0, 6)}-${intent.orgNumber.slice(6)}`
            : intent.orgNumber
          query = query.eq('org_number', formattedOrg)
        }

        if (startDate) {
          query = query.gte('protocol_date', startDate)
        }

        const { data, error } = await query
        if (error) throw error

        return {
          type: 'protocols',
          data: data || [],
          summary: `Hittade ${data?.length || 0} protokoll`
        }
      }

      case 'search_kungorelser': {
        let query = supabase
          .from('Kungorelser')
          .select('id, org_number, company_name, kategori, typ, rubrik, publicerad, created_at')
          .order('publicerad', { ascending: false })
          .limit(10)

        if (intent.orgNumber) {
          query = query.eq('org_number', intent.orgNumber)
        }

        if (startDate) {
          query = query.gte('publicerad', startDate)
        }

        const { data, error } = await query
        if (error) throw error

        return {
          type: 'kungorelser',
          data: data || [],
          summary: `Hittade ${data?.length || 0} kungörelser`
        }
      }

      case 'search_company': {
        if (!intent.orgNumber) {
          // Search by company name keywords
          const searchTerm = intent.keywords.join(' ')
          const { data, error } = await supabase
            .from('LoopBrowse_Protokoll')
            .select('*')
            .ilike('namn', `%${searchTerm}%`)
            .limit(5)

          if (error) throw error

          return {
            type: 'companies',
            data: data || [],
            summary: `Hittade ${data?.length || 0} bolag som matchar "${searchTerm}"`
          }
        }

        // Search by org number
        const formattedOrg = intent.orgNumber.length === 10
          ? `${intent.orgNumber.slice(0, 6)}-${intent.orgNumber.slice(6)}`
          : intent.orgNumber

        const { data, error } = await supabase
          .from('LoopBrowse_Protokoll')
          .select('*')
          .eq('orgnummer', formattedOrg)
          .single()

        if (error && error.code !== 'PGRST116') throw error

        return {
          type: 'companies',
          data: data ? [data] : [],
          summary: data ? `Hittade bolag: ${data.namn}` : 'Inget bolag hittat'
        }
      }

      case 'search_news': {
        let query = supabase
          .from('ProtocolAnalysis')
          .select('id, org_number, company_name, protocol_date, protocol_type, news_content, signals, created_at')
          .not('news_content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)

        if (startDate) {
          query = query.gte('created_at', startDate)
        }

        const { data, error } = await query
        if (error) throw error

        return {
          type: 'news',
          data: data || [],
          summary: `Hittade ${data?.length || 0} nyheter`
        }
      }

      default:
        return null
    }
  } catch (error) {
    console.error('Database query error:', error)
    return null
  }
}

// Format database results for the AI context
function formatResultsForAI(result: QueryResult): string {
  if (result.data.length === 0) {
    return `Inga resultat hittades.`
  }

  let formatted = `${result.summary}:\n\n`

  switch (result.type) {
    case 'protocols':
      result.data.forEach((p: Record<string, unknown>, i: number) => {
        const news = p.news_content as Record<string, unknown> | null
        formatted += `${i + 1}. **${p.company_name}** (${p.org_number})\n`
        formatted += `   Typ: ${p.protocol_type}, Datum: ${p.protocol_date}\n`
        if (news?.rubrik) formatted += `   Rubrik: ${news.rubrik}\n`
        if (p.signals) formatted += `   Signaler: ${JSON.stringify(p.signals)}\n`
        formatted += '\n'
      })
      break

    case 'kungorelser':
      result.data.forEach((k: Record<string, unknown>, i: number) => {
        formatted += `${i + 1}. **${k.company_name || 'Okänt bolag'}** (${k.org_number || '-'})\n`
        formatted += `   Kategori: ${k.kategori}, Typ: ${k.typ}\n`
        formatted += `   Rubrik: ${k.rubrik}\n`
        formatted += `   Publicerad: ${k.publicerad}\n\n`
      })
      break

    case 'companies':
      result.data.forEach((c: Record<string, unknown>, i: number) => {
        formatted += `${i + 1}. **${c.namn}** (${c.orgnummer})\n`
        if (c.vd) formatted += `   VD: ${c.vd}\n`
        if (c.ordforande) formatted += `   Ordförande: ${c.ordforande}\n`
        if (c.storsta_agare) formatted += `   Största ägare: ${c.storsta_agare}\n`
        if (c.stad) formatted += `   Stad: ${c.stad}\n`
        if (c.anstallda) formatted += `   Anställda: ${c.anstallda}\n`
        formatted += '\n'
      })
      break

    case 'news':
      result.data.forEach((n: Record<string, unknown>, i: number) => {
        const news = n.news_content as Record<string, unknown> | null
        formatted += `${i + 1}. **${n.company_name}** (${n.org_number})\n`
        if (news?.rubrik) formatted += `   ${news.rubrik}\n`
        if (news?.notistext) formatted += `   ${(news.notistext as string).slice(0, 200)}...\n`
        formatted += '\n'
      })
      break
  }

  return formatted
}

// Callback type for streaming updates
export type StreamCallback = (text: string, isComplete: boolean) => Promise<void>

// Main function to generate AI response (non-streaming, kept for backwards compatibility)
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: SlackMessage[] = []
): Promise<string> {
  let fullText = ''
  await generateAIResponseStreaming(userMessage, conversationHistory, async (text) => {
    fullText = text
  })
  return fullText
}

// Streaming version that calls back with progressive updates
export async function generateAIResponseStreaming(
  userMessage: string,
  conversationHistory: SlackMessage[] = [],
  onUpdate: StreamCallback
): Promise<void> {
  try {
    // Detect intent and query database
    const intent = detectQueryIntent(userMessage)
    let databaseContext = ''

    if (intent.type !== 'general') {
      const result = await queryDatabase(intent)
      if (result) {
        databaseContext = `\n\n--- DATABASRESULTAT ---\n${formatResultsForAI(result)}\n--- SLUT DATABASRESULTAT ---\n`
      }
    }

    // Build messages for Claude (system prompt is separate)
    const messages = [
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ]

    // Call Claude Opus 4.5 with streaming
    const client = getAnthropic()

    let accumulatedText = ''
    let lastUpdateTime = Date.now()
    const UPDATE_INTERVAL_MS = 500 // Update Slack every 500ms to avoid rate limits

    const stream = client.messages.stream({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1000,
      system: SYSTEM_PROMPT + databaseContext,
      messages,
    })

    stream.on('text', async (text) => {
      accumulatedText += text

      // Throttle updates to avoid Slack rate limits
      const now = Date.now()
      if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
        lastUpdateTime = now
        await onUpdate(accumulatedText + ' ▌', false) // Add cursor indicator
      }
    })

    // Wait for the stream to complete
    await stream.finalMessage()

    // Send final update without cursor
    await onUpdate(accumulatedText, true)

  } catch (error) {
    console.error('AI generation error:', error)
    await onUpdate('Ett fel uppstod när jag försökte svara. Försök igen om en stund.', true)
  }
}

// Get conversation history from a Slack thread
export async function getThreadHistory(
  channel: string,
  threadTs: string,
  botUserId: string
): Promise<SlackMessage[]> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return []

  try {
    const response = await fetch(
      `https://slack.com/api/conversations.replies?channel=${channel}&ts=${threadTs}&limit=20`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    const data = await response.json()
    if (!data.ok || !data.messages) return []

    // Convert to our format, excluding the first message (thread parent) if it's the current one
    return data.messages.slice(1).map((msg: { user?: string; bot_id?: string; text: string }) => ({
      role: msg.user === botUserId || msg.bot_id ? 'assistant' : 'user',
      content: msg.text
    }))

  } catch (error) {
    console.error('Error fetching thread history:', error)
    return []
  }
}
