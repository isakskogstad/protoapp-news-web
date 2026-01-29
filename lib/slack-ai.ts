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

// System prompt that defines LoopDesk bot's personality and capabilities
const SYSTEM_PROMPT = `Du är LoopDesk, en AI-assistent för en svensk redaktion som bevakar bolagshändelser.

Du har tillgång till:
- Protokoll från bolagsstämmor (årsstämmor, extra bolagsstämmor, per capsulam)
- Kungörelser från Post- och Inrikes Tidningar (konkurser, likvidationer, kallelser)
- Analyserade nyheter med nyhetsvärde och signaler
- Bolagsinformation (org.nr, VD, ordförande, ägare)

Du kan hjälpa redaktionen med:
- Sammanfatta protokoll och händelser
- Hitta bolag med specifika händelser (nyemissioner, VD-byten, etc.)
- Svara på frågor om specifika bolag
- Ge översikter och statistik

Svara alltid på svenska. Var koncis och professionell. Använd punktlistor för tydlighet.
Om du inte hittar information, säg det ärligt.

När du listar bolag, inkludera alltid org.nummer i formatet (XXXXXX-XXXX).`

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

// Main function to generate AI response
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: SlackMessage[] = []
): Promise<string> {
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

    // Call Claude Opus 4.5
    const client = getAnthropic()

    const response = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1000,
      system: SYSTEM_PROMPT + databaseContext,
      messages,
    })

    // Extract text from Claude response
    const textBlock = response.content.find(block => block.type === 'text')
    return textBlock && 'text' in textBlock ? textBlock.text : 'Jag kunde inte generera ett svar. Försök igen.'

  } catch (error) {
    console.error('AI generation error:', error)
    return 'Ett fel uppstod när jag försökte svara. Försök igen om en stund.'
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
