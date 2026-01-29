/* eslint-disable @typescript-eslint/no-unused-vars */
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
const SYSTEM_PROMPT = `Du är Loop-AI, en professionell redaktionsassistent för Impact Loop – en svensk nyhetsredaktion specialiserad på bolagshändelser och affärsnyheter.

## DIN ROLL
Du är en trevlig och professionell assistent som hjälper journalisterna på Impact Loop med research, faktakoll och nyhetsproduktion. Du svarar kortfattat, artigt och sakligt.

## KOMMUNIKATIONSSTIL
- Kortfattad och koncis
- Professionell och artig
- Inga emojis
- Svara på svenska
- Var ärlig om du inte vet något

## FORMATERING (VIKTIGT)
Använd Slack mrkdwn-format, INTE HTML eller Markdown:
- *fetstil* (inte **fetstil** eller <b>)
- _kursiv_ (inte *kursiv* eller <i>)
- ~genomstruken~
- \`kod\`
- > citat
- • punktlistor (använd bullet-tecken, inte - eller *)
- Inga HTML-taggar (<br>, <p>, etc.)
- Inga ### rubriker - använd *Rubrik* istället

## NÄR DU SKRIVER NOTISER
- Rubrik: Max 70 tecken, aktivt verb
- Ingress: Vem, vad, när, var
- Brödtext: Viktigast först (inverterad pyramid)
- Inkludera org.nummer (XXXXXX-XXXX) första gången ett bolag nämns
- Saklig och neutral ton

## VERKTYG

*query_database* - Sök i Impact Loops arkiv:
- protocols: Bolagsstämmoprotokoll med AI-analys
- kungorelser: Kungörelser (konkurser, likvidationer, kallelser)
- companies: Bolagsregister med VD, styrelse, ägare
- industries: Lista alla tillgängliga branscher med antal bolag

Branschfiltrering:
- Ange industry-parameter för att filtrera bolag per bransch
- Exempel: query_database(companies, industry="Datakonsulter") - bolag i IT-branschen
- Exempel: query_database(industries) - lista alla branscher
- Branschnamnen är på svenska (t.ex. "Restauranger", "Bygg", "Datakonsulter")

*web_search* - Sök på internet efter:
- Nyhetsartiklar från media (DI, SvD, Breakit, etc.)
- Pressmeddelanden
- Information om personer och bolag
- Aktuella händelser

*create_reminder* - Skapa påminnelser:
- Användaren kan be dig påminna om något
- Ange tid i minuter (60 = 1 timme, 1440 = 1 dag)
- Påminnelsen skickas i samma kanal/tråd

*create_research_thread* - Starta ett research-projekt:
- Skapar en ny tråd för djupgående research om ett ämne
- Tråden kan pinnas för enkel åtkomst
- Returnerar tråd-ID för fortsatt arbete
- Använd för större utredningar som kräver flera steg

*fetch_rss_feed* - Hämta nyheter från RSS-flöden:
- Hämtar senaste artiklarna från ett RSS-flöde
- Stöder svenska nyhetskällor: DI, SvD, Breakit, m.fl.
- Returnerar titel, länk, datum och sammanfattning
- Vanliga feeds:
  - DI: https://www.di.se/rss
  - SvD Näringsliv: https://www.svd.se/feed/naringsliv.rss
  - Breakit: https://www.breakit.se/feed

*get_stock_price* - Hämta aktuell aktiekurs:
- Ange ticker-symbol (t.ex. "HM-B.ST" för H&M på Stockholmsbörsen)
- Svenska aktier: lägg till ".ST" (t.ex. VOLV-B.ST, ERIC-B.ST, SEB-A.ST)
- Amerikanska aktier: använd bara ticker (t.ex. AAPL, MSFT, GOOGL)
- Returnerar: aktuell kurs, förändring i %, volym, valuta

*export_document* - Exportera innehåll till delbar fil:
- Skapar en formaterad Markdown-fil med givet innehåll
- Laddar upp till cloud storage och returnerar nedladdningslänk
- Länken fungerar i 7 dagar
- Använd för att exportera research, sammanfattningar, notiser eller rapporter
- Perfekt för att dela artikelutkast eller sammanställningar med kollegor

*search_person* - Sök efter en person:
- Hitta alla bolag en person är kopplad till
- Visar roller: VD, ordförande, styrelseledamot, suppleant
- Söker i bolagsregister och protokoll
- Exempel: "Vilka bolag sitter Johan Andersson i?"

Använd web_search när användaren frågar om nyheter, artiklar, eller information som inte finns i databasen.`

interface SlackMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface QueryResult {
  type: 'protocols' | 'kungorelser' | 'companies' | 'news' | 'industries'
  data: Record<string, unknown>[]
  summary: string
}

// Detect what kind of query the user is asking
function detectQueryIntent(message: string): {
  type: 'search_protocols' | 'search_kungorelser' | 'search_company' | 'search_news' | 'search_signals' | 'statistics' | 'general'
  keywords: string[]
  orgNumber?: string
  companyName?: string
  timeframe?: 'today' | 'week' | 'month' | 'all'
  signalType?: string
} {
  const lower = message.toLowerCase()

  // Extract org number if present (format: XXXXXX-XXXX or XXXXXXXXXX)
  const orgMatch = message.match(/(\d{6}-?\d{4})/)
  const orgNumber = orgMatch ? orgMatch[1].replace('-', '') : undefined

  // Extract company name if quoted
  const companyMatch = message.match(/"([^"]+)"/) || message.match(/'([^']+)'/)
  const companyName = companyMatch ? companyMatch[1] : undefined

  // Detect timeframe
  let timeframe: 'today' | 'week' | 'month' | 'all' = 'all'
  if (lower.includes('idag') || lower.includes('i dag') || lower.includes('dagens')) timeframe = 'today'
  else if (lower.includes('vecka') || lower.includes('senaste 7') || lower.includes('denna vecka')) timeframe = 'week'
  else if (lower.includes('månad') || lower.includes('senaste 30') || lower.includes('denna månad')) timeframe = 'month'

  // Detect signal type
  let signalType: string | undefined
  if (lower.includes('nyemission') || lower.includes('emission')) signalType = 'emission'
  else if (lower.includes('vd-byte') || lower.includes('ny vd') || lower.includes('vd avgår')) signalType = 'vd_byte'
  else if (lower.includes('styrelse')) signalType = 'styrelseförändring'
  else if (lower.includes('utdelning')) signalType = 'utdelning'
  else if (lower.includes('per capsulam')) signalType = 'per_capsulam'

  // Detect query type - more specific patterns first
  if (lower.includes('statistik') || lower.includes('hur många') || lower.includes('antal') || lower.includes('sammanfatt')) {
    return { type: 'statistics', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
  }

  if (signalType && (lower.includes('vilka') || lower.includes('lista') || lower.includes('bolag med'))) {
    return { type: 'search_signals', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
  }

  if (lower.includes('konkurs') || lower.includes('likvidation') || lower.includes('kungörelse')) {
    return { type: 'search_kungorelser', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
  }

  if (lower.includes('protokoll') || lower.includes('stämma') || lower.includes('emission') ||
      lower.includes('styrelse') || lower.includes('vd-byte') || lower.includes('utdelning')) {
    return { type: 'search_protocols', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
  }

  if (lower.includes('nyhet') || lower.includes('händelse') || lower.includes('senaste')) {
    return { type: 'search_news', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
  }

  if (orgNumber || companyName || lower.includes('bolag') || lower.includes('företag') || lower.includes('vad vet')) {
    return { type: 'search_company', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
  }

  return { type: 'general', keywords: extractKeywords(message), orgNumber, companyName, timeframe, signalType }
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function queryDatabase(intent: ReturnType<typeof detectQueryIntent>): Promise<QueryResult | null> {
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
          .select('id, org_number, company_name, protocol_date, protocol_type, news_content, signals, extracted_data, created_at')
          .order('created_at', { ascending: false })
          .limit(15)

        if (intent.orgNumber) {
          const formattedOrg = intent.orgNumber.length === 10
            ? `${intent.orgNumber.slice(0, 6)}-${intent.orgNumber.slice(6)}`
            : intent.orgNumber
          query = query.eq('org_number', formattedOrg)
        }

        // Search by company name if provided (quoted or from keywords)
        if (intent.companyName) {
          query = query.ilike('company_name', `%${intent.companyName}%`)
        } else if (intent.keywords.length > 0 && !intent.orgNumber) {
          // Try to match company name from keywords
          const searchTerm = intent.keywords.join(' ')
          if (searchTerm.length >= 3) {
            query = query.ilike('company_name', `%${searchTerm}%`)
          }
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
        // First try org number if provided
        if (intent.orgNumber) {
          const formattedOrg = intent.orgNumber.length === 10
            ? `${intent.orgNumber.slice(0, 6)}-${intent.orgNumber.slice(6)}`
            : intent.orgNumber

          const { data, error } = await supabase
            .from('LoopBrowse_Protokoll')
            .select('*')
            .eq('orgnummer', formattedOrg)
            .single()

          if (!error && data) {
            // Also get recent protocols for this company
            const { data: protocols } = await supabase
              .from('ProtocolAnalysis')
              .select('id, protocol_date, protocol_type, news_content, signals')
              .eq('org_number', formattedOrg)
              .order('protocol_date', { ascending: false })
              .limit(5)

            // Also get kungörelser
            const { data: kungorelser } = await supabase
              .from('Kungorelser')
              .select('id, typ, kategori, rubrik, publicerad')
              .eq('org_number', intent.orgNumber)
              .order('publicerad', { ascending: false })
              .limit(5)

            return {
              type: 'companies',
              data: [{
                ...data,
                recent_protocols: protocols || [],
                recent_kungorelser: kungorelser || []
              }],
              summary: `Hittade bolag: ${data.namn}`
            }
          }
        }

        // Search by company name (quoted or from keywords)
        const searchTerm = intent.companyName || intent.keywords.join(' ')
        if (!searchTerm || searchTerm.length < 2) {
          return {
            type: 'companies',
            data: [],
            summary: 'Ange bolagsnamn eller organisationsnummer för att söka'
          }
        }

        const { data, error } = await supabase
          .from('LoopBrowse_Protokoll')
          .select('*')
          .ilike('namn', `%${searchTerm}%`)
          .limit(10)

        if (error) throw error

        return {
          type: 'companies',
          data: data || [],
          summary: `Hittade ${data?.length || 0} bolag som matchar "${searchTerm}"`
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

        // Filter by company name if provided
        if (intent.companyName) {
          query = query.ilike('company_name', `%${intent.companyName}%`)
        }

        const { data, error } = await query
        if (error) throw error

        return {
          type: 'news',
          data: data || [],
          summary: `Hittade ${data?.length || 0} nyheter`
        }
      }

      case 'search_signals': {
        // Search for protocols with specific signals
        let query = supabase
          .from('ProtocolAnalysis')
          .select('id, org_number, company_name, protocol_date, protocol_type, news_content, signals, extracted_data, created_at')
          .order('created_at', { ascending: false })
          .limit(15)

        if (startDate) {
          query = query.gte('protocol_date', startDate)
        }

        // Filter by company name if provided
        if (intent.companyName) {
          query = query.ilike('company_name', `%${intent.companyName}%`)
        }

        const { data, error } = await query
        if (error) throw error

        // Filter by signal type in application layer (JSONB filtering)
        let filteredData = data || []
        if (intent.signalType && filteredData.length > 0) {
          filteredData = filteredData.filter(item => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signals = item.signals as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extracted = item.extracted_data as any

            const detekterade = signals?.detekterade as Array<{ signal?: string }> | undefined

            if (intent.signalType === 'emission') {
              return detekterade?.some(s => s.signal?.toLowerCase().includes('emission')) ||
                extracted?.kapitalåtgärder?.nyemission?.beslutad
            }
            if (intent.signalType === 'vd_byte') {
              return detekterade?.some(s => s.signal?.toLowerCase().includes('vd'))
            }
            if (intent.signalType === 'styrelseförändring') {
              return detekterade?.some(s => s.signal?.toLowerCase().includes('styrelse')) ||
                (extracted?.styrelse?.tillträdande_ledamöter?.length || 0) > 0
            }
            if (intent.signalType === 'utdelning') {
              return detekterade?.some(s => s.signal?.toLowerCase().includes('utdelning'))
            }
            if (intent.signalType === 'per_capsulam') {
              return item.protocol_type?.toLowerCase().includes('per capsulam')
            }
            return true
          })
        }

        return {
          type: 'protocols',
          data: filteredData,
          summary: `Hittade ${filteredData.length} protokoll med ${intent.signalType || 'signaler'}`
        }
      }

      case 'statistics': {
        // Get statistics about the database
        const stats: Record<string, unknown> = {}

        // Count protocols
        const { count: protocolCount } = await supabase
          .from('ProtocolAnalysis')
          .select('*', { count: 'exact', head: true })
        stats.totalt_protokoll = protocolCount || 0

        // Count kungörelser
        const { count: kungorelseCount } = await supabase
          .from('Kungorelser')
          .select('*', { count: 'exact', head: true })
        stats.totalt_kungorelser = kungorelseCount || 0

        // Count companies
        const { count: companyCount } = await supabase
          .from('LoopBrowse_Protokoll')
          .select('*', { count: 'exact', head: true })
        stats.totalt_bolag = companyCount || 0

        // Recent activity
        if (startDate) {
          const { count: recentProtocols } = await supabase
            .from('ProtocolAnalysis')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
          stats.protokoll_perioden = recentProtocols || 0

          const { count: recentKungorelser } = await supabase
            .from('Kungorelser')
            .select('*', { count: 'exact', head: true })
            .gte('publicerad', startDate)
          stats.kungorelser_perioden = recentKungorelser || 0
        }

        // Count by protocol type
        const { data: protocolTypes } = await supabase
          .from('ProtocolAnalysis')
          .select('protocol_type')

        if (protocolTypes) {
          const typeCounts: Record<string, number> = {}
          protocolTypes.forEach(p => {
            const type = p.protocol_type || 'okänd'
            typeCounts[type] = (typeCounts[type] || 0) + 1
          })
          stats.protokoll_per_typ = typeCounts
        }

        return {
          type: 'companies',
          data: [stats],
          summary: 'Databasstatistik'
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
export function formatResultsForAI(result: QueryResult): string {
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
        // Check if this is statistics data
        if (c.totalt_protokoll !== undefined) {
          formatted += `**DATABASSTATISTIK**\n`
          formatted += `• Totalt protokoll: ${c.totalt_protokoll}\n`
          formatted += `• Totalt kungörelser: ${c.totalt_kungorelser}\n`
          formatted += `• Totalt bolag: ${c.totalt_bolag}\n`
          if (c.protokoll_perioden !== undefined) {
            formatted += `• Protokoll denna period: ${c.protokoll_perioden}\n`
            formatted += `• Kungörelser denna period: ${c.kungorelser_perioden}\n`
          }
          if (c.protokoll_per_typ) {
            formatted += `\n**Per protokolltyp:**\n`
            const types = c.protokoll_per_typ as Record<string, number>
            Object.entries(types).forEach(([typ, count]) => {
              formatted += `• ${typ}: ${count}\n`
            })
          }
          return
        }

        // Regular company data
        formatted += `${i + 1}. **${c.namn}** (${c.orgnummer})\n`
        if (c.vd) formatted += `   VD: ${c.vd}\n`
        if (c.ordforande) formatted += `   Ordförande: ${c.ordforande}\n`
        if (c.storsta_agare) formatted += `   Största ägare: ${c.storsta_agare}\n`
        if (c.stad) formatted += `   Stad: ${c.stad}\n`
        if (c.anstallda) formatted += `   Anställda: ${c.anstallda}\n`
        if (c.omsattning) formatted += `   Omsättning: ${c.omsattning}\n`

        // Recent protocols
        const protocols = c.recent_protocols as Array<Record<string, unknown>> | undefined
        if (protocols && protocols.length > 0) {
          formatted += `\n   **Senaste protokoll:**\n`
          protocols.forEach(p => {
            const news = p.news_content as Record<string, unknown> | null
            formatted += `   • ${p.protocol_date} - ${p.protocol_type}`
            if (news?.rubrik) formatted += `: ${news.rubrik}`
            formatted += '\n'
          })
        }

        // Recent kungörelser
        const kungorelser = c.recent_kungorelser as Array<Record<string, unknown>> | undefined
        if (kungorelser && kungorelser.length > 0) {
          formatted += `\n   **Senaste kungörelser:**\n`
          kungorelser.forEach(k => {
            formatted += `   • ${k.publicerad} - ${k.kategori}: ${k.rubrik || k.typ}\n`
          })
        }

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

// Web search tool for finding news articles and external info
const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
}

// Reminder tool - schedules a message in Slack
const REMINDER_TOOL: Anthropic.Messages.Tool = {
  name: 'create_reminder',
  description: `Skapa en påminnelse som skickas vid en specifik tidpunkt. Använd detta när användaren ber om att bli påmind om något.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string',
        description: 'Påminnelsetexten som ska skickas'
      },
      delay_minutes: {
        type: 'number',
        description: 'Antal minuter tills påminnelsen ska skickas (t.ex. 30 för 30 minuter, 60 för 1 timme, 1440 för 1 dag)'
      }
    },
    required: ['message', 'delay_minutes']
  }
}

// Stock price tool - fetches current stock price from Yahoo Finance
const STOCK_PRICE_TOOL: Anthropic.Messages.Tool = {
  name: 'get_stock_price',
  description: `Hämta aktuell aktiekurs för en given ticker-symbol. Använd detta när användaren frågar om aktiekurser, börskurser eller aktiepris.

Exempel på ticker-symboler:
- Svenska aktier (Stockholmsbörsen): HM-B.ST, VOLV-B.ST, ERIC-B.ST, SEB-A.ST, INVE-B.ST
- Amerikanska aktier: AAPL, MSFT, GOOGL, AMZN, TSLA
- Andra europeiska: BMW.DE (Tyskland), MC.PA (Frankrike)

Returnerar aktuell kurs, förändring (kr och %), dagens högsta/lägsta, volym och valuta.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      ticker: {
        type: 'string',
        description: 'Ticker-symbolen för aktien (t.ex. "HM-B.ST" för H&M på Stockholmsbörsen, "AAPL" för Apple)'
      }
    },
    required: ['ticker']
  }
}

// Stock price result interface
interface StockPriceResult {
  success: boolean
  ticker: string
  name?: string
  price?: number
  currency?: string
  change?: number
  changePercent?: number
  dayHigh?: number
  dayLow?: number
  volume?: number
  marketTime?: string
  error?: string
}

// Fetch stock price from Yahoo Finance
async function getStockPrice(ticker: string): Promise<StockPriceResult> {
  const cleanTicker = ticker.trim().toUpperCase()
  console.log(`[Stock] Fetching price for: ${cleanTicker}`)

  try {
    // Use Yahoo Finance v8 API (publicly accessible)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanTicker)}?interval=1d&range=1d`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`[Stock] HTTP error: ${response.status}`)
      return {
        success: false,
        ticker: cleanTicker,
        error: `Kunde inte hämta data för ${cleanTicker}. Kontrollera att ticker-symbolen är korrekt.`
      }
    }

    const data = await response.json()

    // Check for errors in response
    if (data.chart?.error) {
      console.error(`[Stock] API error:`, data.chart.error)
      return {
        success: false,
        ticker: cleanTicker,
        error: data.chart.error.description || 'Okänd aktie'
      }
    }

    const result = data.chart?.result?.[0]
    if (!result) {
      return {
        success: false,
        ticker: cleanTicker,
        error: `Ingen data hittades för ${cleanTicker}`
      }
    }

    const meta = result.meta
    const quote = result.indicators?.quote?.[0]

    // Get the most recent values
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.previousClose || meta.chartPreviousClose
    const change = currentPrice && previousClose ? currentPrice - previousClose : undefined
    const changePercent = change && previousClose ? (change / previousClose) * 100 : undefined

    // Get day high/low from quote data or meta
    const dayHigh = quote?.high?.[quote.high.length - 1] || meta.regularMarketDayHigh
    const dayLow = quote?.low?.[quote.low.length - 1] || meta.regularMarketDayLow
    const volume = quote?.volume?.[quote.volume.length - 1] || meta.regularMarketVolume

    // Format market time
    const marketTime = meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
      : undefined

    console.log(`[Stock] Success: ${cleanTicker} = ${currentPrice} ${meta.currency}`)

    return {
      success: true,
      ticker: cleanTicker,
      name: meta.shortName || meta.longName || cleanTicker,
      price: currentPrice,
      currency: meta.currency,
      change: change ? Math.round(change * 100) / 100 : undefined,
      changePercent: changePercent ? Math.round(changePercent * 100) / 100 : undefined,
      dayHigh: dayHigh ? Math.round(dayHigh * 100) / 100 : undefined,
      dayLow: dayLow ? Math.round(dayLow * 100) / 100 : undefined,
      volume: volume ? Math.round(volume) : undefined,
      marketTime,
    }
  } catch (err) {
    console.error('[Stock] Error:', err)
    return {
      success: false,
      ticker: cleanTicker,
      error: err instanceof Error ? err.message : 'Kunde inte hämta aktiekurs'
    }
  }
}

// Format stock price result for AI response
function formatStockPriceResult(result: StockPriceResult): string {
  if (!result.success) {
    return `Fel: ${result.error}`
  }

  const lines = [
    `Aktie: ${result.name} (${result.ticker})`,
    `Kurs: ${result.price} ${result.currency}`,
  ]

  if (result.change !== undefined && result.changePercent !== undefined) {
    const sign = result.change >= 0 ? '+' : ''
    lines.push(`Förändring: ${sign}${result.change} ${result.currency} (${sign}${result.changePercent}%)`)
  }

  if (result.dayHigh !== undefined && result.dayLow !== undefined) {
    lines.push(`Dagens högsta/lägsta: ${result.dayHigh} / ${result.dayLow} ${result.currency}`)
  }

  if (result.volume !== undefined) {
    lines.push(`Volym: ${result.volume.toLocaleString('sv-SE')}`)
  }

  if (result.marketTime) {
    lines.push(`Senast uppdaterad: ${result.marketTime}`)
  }

  return lines.join('\n')
}

// RSS Feed tool for fetching news from Swedish media
const RSS_FEED_TOOL: Anthropic.Messages.Tool = {
  name: 'fetch_rss_feed',
  description: `Hämta senaste nyheterna från ett RSS-flöde. Använd för att bevaka svenska affärsnyheter.

## VANLIGA RSS-FEEDS
- DI (Dagens Industri): https://www.di.se/rss
- SvD Näringsliv: https://www.svd.se/feed/naringsliv.rss
- Breakit: https://www.breakit.se/feed

## ANVÄNDNING
Hämtar titel, länk, publiceringsdatum och sammanfattning för varje artikel.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      feed_url: {
        type: 'string',
        description: 'RSS-flödets URL (t.ex. https://www.di.se/rss)'
      },
      limit: {
        type: 'number',
        description: 'Max antal artiklar att hämta (default 5, max 20)'
      }
    },
    required: ['feed_url']
  }
}

// RSS Feed item interface
interface RSSFeedItem {
  title: string
  link: string
  pubDate: string
  summary: string
}

// Parse RSS XML and extract items
function parseRSSXml(xmlText: string, limit: number = 5): RSSFeedItem[] {
  const items: RSSFeedItem[] = []
  const maxItems = Math.min(limit, 20)

  // Match all <item> or <entry> blocks (RSS 2.0 and Atom)
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi
  let itemMatch

  while ((itemMatch = itemRegex.exec(xmlText)) !== null && items.length < maxItems) {
    const itemContent = itemMatch[1] || itemMatch[2]

    // Extract title
    const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    const title = titleMatch ? cleanRssXmlText(titleMatch[1]) : 'Utan titel'

    // Extract link (handle both RSS and Atom formats)
    let link = ''
    const linkMatch = itemContent.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
    const atomLinkMatch = itemContent.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
    if (linkMatch && linkMatch[1].trim()) {
      link = cleanRssXmlText(linkMatch[1])
    } else if (atomLinkMatch) {
      link = atomLinkMatch[1]
    }

    // Extract publication date (handle multiple formats)
    const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                         itemContent.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
                         itemContent.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) ||
                         itemContent.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)
    const pubDate = pubDateMatch ? formatRSSDate(cleanRssXmlText(pubDateMatch[1])) : ''

    // Extract summary/description
    const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                      itemContent.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ||
                      itemContent.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)
    let summary = descMatch ? cleanRssXmlText(descMatch[1]) : ''

    // Strip HTML tags from summary and truncate
    summary = summary.replace(/<[^>]*>/g, '').trim()
    if (summary.length > 300) {
      summary = summary.slice(0, 297) + '...'
    }

    items.push({ title, link, pubDate, summary })
  }

  return items
}

// Clean XML text (decode entities, remove CDATA markers)
function cleanRssXmlText(text: string): string {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .trim()
}

// Format RSS date to Swedish format
function formatRSSDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    })
  } catch {
    return dateStr
  }
}

// Fetch and parse RSS feed
async function fetchRSSFeed(
  feedUrl: string,
  limit: number = 5
): Promise<{ items: RSSFeedItem[] | null; error: string | null }> {
  console.log(`[RSS] Fetching: ${feedUrl}, limit: ${limit}`)

  try {
    // Validate URL
    const url = new URL(feedUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { items: null, error: 'Endast HTTP/HTTPS-URL:er stöds' }
    }

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Loop-AI/1.0 (Impact Loop News Bot)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      return { items: null, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('xml') && !contentType.includes('rss')) {
      console.warn(`[RSS] Unexpected content-type: ${contentType}`)
    }

    const xmlText = await response.text()

    if (!xmlText.includes('<rss') && !xmlText.includes('<feed') && !xmlText.includes('<item')) {
      return { items: null, error: 'Svaret verkar inte vara ett giltigt RSS-flöde' }
    }

    const items = parseRSSXml(xmlText, limit)

    if (items.length === 0) {
      return { items: null, error: 'Inga artiklar hittades i flödet' }
    }

    console.log(`[RSS] Parsed ${items.length} items from ${feedUrl}`)
    return { items, error: null }

  } catch (err) {
    console.error('[RSS] Fetch error:', err)
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        return { items: null, error: 'Timeout - flödet svarade inte inom 10 sekunder' }
      }
      return { items: null, error: err.message }
    }
    return { items: null, error: 'Kunde inte hämta RSS-flödet' }
  }
}

// Format RSS feed result for AI response
function formatRSSFeedResult(items: RSSFeedItem[] | null, error: string | null): string {
  if (error) {
    return `Fel: ${error}`
  }

  if (!items || items.length === 0) {
    return 'Inga artiklar hittades i RSS-flödet.'
  }

  const lines: string[] = [`Hittade ${items.length} artiklar:\n`]

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`)
    if (item.pubDate) {
      lines.push(`   Publicerad: ${item.pubDate}`)
    }
    if (item.link) {
      lines.push(`   Länk: ${item.link}`)
    }
    if (item.summary) {
      lines.push(`   ${item.summary}`)
    }
    lines.push('')
  })

  return lines.join('\n')
}

// Export document tool - creates a document and uploads to Supabase Storage
const EXPORT_DOCUMENT_TOOL: Anthropic.Messages.Tool = {
  name: 'export_document',
  description: `Exportera innehåll till en delbar fil. Skapar en Markdown-fil och laddar upp till cloud storage.

Använd detta verktyg när användaren vill:
- Exportera research eller sammanfattningar
- Skapa delbara rapporter eller artikelutkast
- Spara information för senare användning
- Dela dokument med kollegor

Returnerar en nedladdningslänk som fungerar i 7 dagar.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Dokumentets titel (blir filnamn och rubrik)'
      },
      content: {
        type: 'string',
        description: 'Innehållet som ska exporteras (Markdown-format rekommenderas)'
      }
    },
    required: ['title', 'content']
  }
}

// Export document result interface
interface ExportDocumentResult {
  success: boolean
  url?: string
  filename?: string
  size?: number
  expiresAt?: string
  error?: string
}

// Create and upload document to Supabase Storage
async function exportDocument(title: string, content: string): Promise<ExportDocumentResult> {
  console.log(`[Export] Creating document: ${title}`)

  try {
    const supabase = createServerClient()

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeTitle = title
      .toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
    const filename = `${safeTitle}-${timestamp}.md`

    // Create document content with header
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
    const documentContent = `# ${title}

_Exporterad från Loop-AI ${now}_

---

${content}

---
_Detta dokument skapades automatiskt av Loop-AI._
`

    // Convert to buffer
    const buffer = Buffer.from(documentContent, 'utf-8')

    // Upload to Supabase Storage (exports bucket)
    const { error } = await supabase.storage
      .from('exports')
      .upload(`slack-exports/${filename}`, buffer, {
        contentType: 'text/markdown',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('[Export] Upload error:', error)

      // If bucket doesn't exist, try creating it or use a fallback approach
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        // Try LoopBrowse bucket as fallback
        const { error: fallbackError } = await supabase.storage
          .from('LoopBrowse')
          .upload(`exports/${filename}`, buffer, {
            contentType: 'text/markdown',
            cacheControl: '3600',
            upsert: false
          })

        if (fallbackError) {
          console.error('[Export] Fallback upload error:', fallbackError)
          return {
            success: false,
            error: `Kunde inte ladda upp dokumentet: ${fallbackError.message}`
          }
        }

        // Get signed URL from fallback bucket (7 days)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('LoopBrowse')
          .createSignedUrl(`exports/${filename}`, 60 * 60 * 24 * 7) // 7 days

        if (signedUrlError) {
          console.error('[Export] Signed URL error:', signedUrlError)
          return {
            success: false,
            error: `Kunde inte skapa nedladdningslänk: ${signedUrlError.message}`
          }
        }

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })

        console.log(`[Export] Success (fallback): ${filename}`)
        return {
          success: true,
          url: signedUrlData.signedUrl,
          filename,
          size: buffer.length,
          expiresAt
        }
      }

      return {
        success: false,
        error: `Kunde inte ladda upp dokumentet: ${error.message}`
      }
    }

    // Get signed URL (7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(`slack-exports/${filename}`, 60 * 60 * 24 * 7) // 7 days

    if (signedUrlError) {
      console.error('[Export] Signed URL error:', signedUrlError)
      return {
        success: false,
        error: `Kunde inte skapa nedladdningslänk: ${signedUrlError.message}`
      }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })

    console.log(`[Export] Success: ${filename}`)
    return {
      success: true,
      url: signedUrlData.signedUrl,
      filename,
      size: buffer.length,
      expiresAt
    }
  } catch (err) {
    console.error('[Export] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Okänt fel vid export'
    }
  }
}

// Format export result for AI response
function formatExportResult(result: ExportDocumentResult): string {
  if (!result.success) {
    return `Fel: ${result.error}`
  }

  const lines = [
    `Dokumentet har exporterats!`,
    `Filnamn: ${result.filename}`,
    `Storlek: ${result.size} bytes`,
    `Länk giltig till: ${result.expiresAt}`,
    ``,
    `Nedladdningslänk: ${result.url}`
  ]

  return lines.join('\n')
}

// Execute reminder creation via Slack scheduled message
async function createReminder(
  channelId: string,
  threadTs: string | undefined,
  message: string,
  delayMinutes: number
): Promise<{ success: boolean; error?: string; scheduled_time?: string }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return { success: false, error: 'Slack token saknas' }
  }

  const postAt = Math.floor(Date.now() / 1000) + (delayMinutes * 60)
  const scheduledDate = new Date(postAt * 1000)

  try {
    const response = await fetch('https://slack.com/api/chat.scheduleMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: `Påminnelse: ${message}`,
        post_at: postAt,
        thread_ts: threadTs,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('[Reminder] Slack error:', data.error)
      return { success: false, error: data.error }
    }

    console.log(`[Reminder] Scheduled for ${scheduledDate.toISOString()}`)
    return {
      success: true,
      scheduled_time: scheduledDate.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
    }
  } catch (err) {
    console.error('[Reminder] Error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Okänt fel' }
  }
}

// Research thread creation tool
const CREATE_RESEARCH_THREAD_TOOL: Anthropic.Messages.Tool = {
  name: 'create_research_thread',
  description: `Skapa en ny tråd för ett research-projekt. Används för djupgående utredningar som kräver flera steg eller som ska dokumenteras.

Verktyget skapar en formaterad tråd med:
- Tydlig rubrik och ämnesbeskrivning
- Sammanfattning av vad som ska undersökas
- Valfritt: Pinnar tråden för enkel åtkomst

Använd detta när:
- Användaren vill starta en större utredning
- Research behöver dokumenteras i en separat tråd
- Flera personer ska samarbeta kring ett ämne`,
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: {
        type: 'string',
        description: 'Ämnet/frågan som ska utredas (t.ex. "Nyemissioner i techsektorn Q4 2025")'
      },
      description: {
        type: 'string',
        description: 'Kort beskrivning av vad som ska undersökas och varför'
      },
      research_plan: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista med planerade research-steg (t.ex. ["Sök i protokoll", "Kolla kungörelser", "Web-sökning"])'
      },
      pin_thread: {
        type: 'boolean',
        description: 'Om tråden ska pinnas i kanalen för enkel åtkomst (default: false)'
      }
    },
    required: ['topic', 'description']
  }
}

// Execute research thread creation
async function createResearchThread(
  channelId: string,
  topic: string,
  description: string,
  researchPlan?: string[],
  pinThread: boolean = false
): Promise<{ success: boolean; error?: string; thread_ts?: string; permalink?: string }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return { success: false, error: 'Slack token saknas' }
  }

  // Format the research thread initial message
  const planSection = researchPlan && researchPlan.length > 0
    ? `\n\n*Planerade steg:*\n${researchPlan.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
    : ''

  const timestamp = new Date().toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  const messageText = `*Research: ${topic}*

_Startad ${timestamp}_

*Bakgrund:*
${description}${planSection}

---
_Svara i denna tråd för att lägga till findings och uppdateringar._`

  try {
    // Post the initial message (this creates the thread)
    const postResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: messageText,
        unfurl_links: false,
        unfurl_media: false,
      }),
    })

    const postData = await postResponse.json()

    if (!postData.ok) {
      console.error('[Research Thread] Slack error:', postData.error)
      return { success: false, error: postData.error }
    }

    const threadTs = postData.ts
    console.log(`[Research Thread] Created thread: ${threadTs}`)

    // Pin the message if requested
    if (pinThread) {
      try {
        const pinResponse = await fetch('https://slack.com/api/pins.add', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: channelId,
            timestamp: threadTs,
          }),
        })

        const pinData = await pinResponse.json()
        if (!pinData.ok) {
          console.warn('[Research Thread] Could not pin message:', pinData.error)
          // Don't fail the whole operation if pinning fails
        } else {
          console.log('[Research Thread] Message pinned')
        }
      } catch (pinErr) {
        console.warn('[Research Thread] Pin error:', pinErr)
      }
    }

    // Get permalink for the thread
    let permalink: string | undefined
    try {
      const permalinkResponse = await fetch('https://slack.com/api/chat.getPermalink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelId,
          message_ts: threadTs,
        }),
      })

      const permalinkData = await permalinkResponse.json()
      if (permalinkData.ok) {
        permalink = permalinkData.permalink
      }
    } catch (permalinkErr) {
      console.warn('[Research Thread] Could not get permalink:', permalinkErr)
    }

    return {
      success: true,
      thread_ts: threadTs,
      permalink
    }
  } catch (err) {
    console.error('[Research Thread] Error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Okänt fel' }
  }
}

// Person search tool - finds people across all tables
const SEARCH_PERSON_TOOL: Anthropic.Messages.Tool = {
  name: 'search_person',
  description: `Sök efter en person och hitta alla bolag de är kopplade till.

Söker i:
- LoopBrowse_Protokoll: vd, ordforande kolumner
- ProtocolAnalysis: extracted_data->styrelse->ledamöter, extracted_data->befattningshavare->vd

Returnerar:
- Alla bolag personen är kopplad till
- Personens roller (VD, ordförande, styrelseledamot, suppleant)
- Protokolldatum om från ProtocolAnalysis

Använd detta verktyg när användaren frågar om en specifik person, t.ex. "Vilka bolag sitter Johan Andersson i?" eller "Vem är Erik Svensson?"`,
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Namnet på personen att söka efter (för- och efternamn)'
      }
    },
    required: ['name']
  }
}

// Interface for person search results
interface PersonSearchResult {
  company_name: string
  org_number: string
  roles: string[]
  source: 'bolagsregister' | 'protokoll'
  protocol_date?: string
  protocol_type?: string
}

// Execute person search across tables
async function searchPerson(name: string): Promise<{ results: PersonSearchResult[]; error: string | null }> {
  const supabase = createServerClient()
  const results: PersonSearchResult[] = []
  const searchName = name.toLowerCase().trim()

  console.log(`[Person Search] Searching for: "${name}"`)

  try {
    // 1. Search LoopBrowse_Protokoll for VD and ordförande
    const { data: companyData, error: companyError } = await supabase
      .from('LoopBrowse_Protokoll')
      .select('orgnummer, namn, vd, ordforande')
      .or(`vd.ilike.%${searchName}%,ordforande.ilike.%${searchName}%`)
      .limit(50)

    if (companyError) {
      console.error('[Person Search] Company query error:', companyError)
    } else if (companyData) {
      console.log(`[Person Search] Found ${companyData.length} matches in LoopBrowse_Protokoll`)

      for (const company of companyData) {
        const roles: string[] = []

        if (company.vd && company.vd.toLowerCase().includes(searchName)) {
          roles.push('VD')
        }
        if (company.ordforande && company.ordforande.toLowerCase().includes(searchName)) {
          roles.push('Styrelseordförande')
        }

        if (roles.length > 0) {
          results.push({
            company_name: company.namn || 'Okänt bolag',
            org_number: company.orgnummer || '',
            roles,
            source: 'bolagsregister'
          })
        }
      }
    }

    // 2. Search ProtocolAnalysis for styrelse and befattningshavare
    const { data: protocolData, error: protocolError } = await supabase
      .from('ProtocolAnalysis')
      .select('org_number, company_name, protocol_date, protocol_type, extracted_data')
      .not('extracted_data', 'is', null)
      .order('protocol_date', { ascending: false })
      .limit(500)

    if (protocolError) {
      console.error('[Person Search] Protocol query error:', protocolError)
    } else if (protocolData) {
      console.log(`[Person Search] Checking ${protocolData.length} protocols for matches`)

      for (const protocol of protocolData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extracted = protocol.extracted_data as any
        if (!extracted) continue

        const roles: string[] = []

        // Check VD in befattningshavare
        const vdNamn = extracted?.befattningshavare?.vd?.namn
        if (vdNamn && typeof vdNamn === 'string' && vdNamn.toLowerCase().includes(searchName)) {
          roles.push('VD')
        }

        // Check styrelseordförande
        const ordforande = extracted?.styrelse?.ordförande
        if (ordforande && typeof ordforande === 'string' && ordforande.toLowerCase().includes(searchName)) {
          roles.push('Styrelseordförande')
        }

        // Check styrelseledamöter
        const ledamoter = extracted?.styrelse?.ledamöter
        if (Array.isArray(ledamoter)) {
          for (const ledamot of ledamoter) {
            if (ledamot.namn && ledamot.namn.toLowerCase().includes(searchName)) {
              const roll = ledamot.roll || 'Styrelseledamot'
              if (!roles.includes(roll)) {
                roles.push(roll)
              }
            }
          }
        }

        // Check suppleanter
        const suppleanter = extracted?.styrelse?.suppleanter
        if (Array.isArray(suppleanter)) {
          for (const suppleant of suppleanter) {
            if (suppleant.namn && suppleant.namn.toLowerCase().includes(searchName)) {
              if (!roles.includes('Styrelsesuppleant')) {
                roles.push('Styrelsesuppleant')
              }
            }
          }
        }

        if (roles.length > 0) {
          // Check if we already have this company
          const existingIndex = results.findIndex(r => r.org_number === protocol.org_number)

          if (existingIndex >= 0) {
            // Merge roles
            for (const role of roles) {
              if (!results[existingIndex].roles.includes(role)) {
                results[existingIndex].roles.push(role)
              }
            }
            results[existingIndex].protocol_date = protocol.protocol_date || undefined
            results[existingIndex].protocol_type = protocol.protocol_type || undefined
          } else {
            results.push({
              company_name: protocol.company_name || 'Okänt bolag',
              org_number: protocol.org_number || '',
              roles,
              source: 'protokoll',
              protocol_date: protocol.protocol_date || undefined,
              protocol_type: protocol.protocol_type || undefined
            })
          }
        }
      }
    }

    // Deduplicate by org_number
    const uniqueResults = new Map<string, PersonSearchResult>()
    for (const result of results) {
      const key = result.org_number || result.company_name
      const existing = uniqueResults.get(key)
      if (!existing || result.roles.length > existing.roles.length) {
        uniqueResults.set(key, result)
      }
    }

    const finalResults = Array.from(uniqueResults.values())
    console.log(`[Person Search] Final results: ${finalResults.length} companies`)

    return { results: finalResults, error: null }
  } catch (err) {
    console.error('[Person Search] Error:', err)
    return { results: [], error: err instanceof Error ? err.message : 'Okänt fel' }
  }
}

// Format person search results for AI
function formatPersonSearchResults(name: string, results: PersonSearchResult[]): string {
  if (results.length === 0) {
    return `Hittade inga kopplingar för "${name}" i databasen.`
  }

  let formatted = `Hittade ${results.length} bolagskopplingar för "${name}":\n\n`

  for (const result of results) {
    formatted += `• *${result.company_name}* (${result.org_number})\n`
    formatted += `  Roller: ${result.roles.join(', ')}\n`
    if (result.protocol_date) {
      formatted += `  Protokoll: ${result.protocol_date}`
      if (result.protocol_type) {
        formatted += ` (${result.protocol_type})`
      }
      formatted += '\n'
    }
    formatted += '\n'
  }

  return formatted
}

// Custom Supabase query tool for Claude
const SUPABASE_QUERY_TOOL: Anthropic.Messages.Tool = {
  name: 'query_database',
  description: `Sök i Impact Loops databas. Returnerar data från protokoll, kungörelser och bolagsregister.

## TABELLER

### ProtocolAnalysis - AI-analyserade bolagsstämmoprotokoll
Kolumner: id, org_number, company_name, protocol_date, protocol_type, created_at, analyzed_at

**news_content** (JSONB) - Genererad nyhetsnotis:
- rubrik: string
- notistext: string
- nyckeldata: { nyhetsvärde: number, händelsetyp: string }

**signals** (JSONB) - Detekterade signaler:
- detekterade: [{ signal: string, styrka: string, detaljer: string }]
- nyhetsvärde_total: number (1-10)
- varningsflaggor: string[]

**extracted_data** (JSONB) - Extraherad protokolldata:
- bolag: { namn, org_nummer, säte, aktiekapital, antal_aktier, kvotvärde }
- metadata: { datum, plats, typ, ordförande, protokollförare, justerare }
- styrelse:
  - ordförande: string
  - ledamöter: [{ namn, roll, personnummer }]
  - suppleanter: [{ namn }]
  - tillträdande_ledamöter: [{ namn, roll }]
  - avgående_ledamöter: [{ namn, roll }]
- befattningshavare:
  - vd: { namn, personnummer }
  - revisor: { namn, bolag }
- kapitalåtgärder:
  - nyemission: { beslutad, typ, antal_nya_aktier, teckningskurs_kr, emissionsbelopp_kr, villkor }
  - fondemission: { beslutad, belopp }
  - utdelning: { beslutad, belopp_per_aktie, total }
  - bemyndigande: { beslutad, max_antal_aktier }
- ägare: [{ namn, aktier, andel_procent, röster_procent }]
- röstlängd: [{ namn, aktier, röster }]

**calculations** (JSONB) - Beräknade värden:
- emission: { emissionsbelopp_kr, pre_money_värdering, post_money_värdering }
- utspädning: { utspädning_procent, nya_aktier, totalt_efter }
- värdering: { implicit_värdering_msek, pris_per_aktie }
- ägarförändring: { före: [], efter: [] }

### Kungorelser - Kungörelser från Post- och Inrikes Tidningar
Kolumner: id, org_number, company_name, kategori, typ, rubrik, kungorelsetext, publicerad, amnesomrade, created_at

Kategorier: konkurser, likvidationer, kallelser, fusioner, delningar, registreringar

**konkurs_data** (JSONB): { tingsratt, konkursforvaltare, datum_konkursbeslut }
**stamma_data** (JSONB): { datum, tid, plats, arenden }

### LoopBrowse_Protokoll - Bolagsregister med ~50k bolag
Kolumner: orgnummer, namn, vd, ordforande, storsta_agare, stad, anstallda, omsattning, bransch

## EXEMPEL

-- Bolag med nyemission över 10 MSEK
SELECT company_name, org_number,
  extracted_data->'kapitalåtgärder'->'nyemission'->>'emissionsbelopp_kr' as belopp
FROM "ProtocolAnalysis"
WHERE (extracted_data->'kapitalåtgärder'->'nyemission'->>'emissionsbelopp_kr')::numeric > 10000000
ORDER BY protocol_date DESC LIMIT 10

-- Styrelseledamöter för ett bolag
SELECT company_name, extracted_data->'styrelse' as styrelse
FROM "ProtocolAnalysis" WHERE org_number = '556XXX-XXXX' LIMIT 1

-- Bolag i Stockholm med VD
SELECT namn, vd, ordforande, anstallda FROM "LoopBrowse_Protokoll"
WHERE stad ILIKE '%stockholm%' AND vd IS NOT NULL LIMIT 10

-- Senaste konkurserna
SELECT company_name, publicerad, konkurs_data FROM "Kungorelser"
WHERE kategori = 'konkurser' ORDER BY publicerad DESC LIMIT 10

-- Lista alla branscher
query_type: "industries" - Returnerar lista med alla branscher och antal bolag per bransch

-- Filtrera bolag per bransch
query_type: "companies", industry: "Datakonsulter" - Alla datakonsultbolag
query_type: "companies", industry: "Restauranger" - Alla restaurangbolag`,
  input_schema: {
    type: 'object' as const,
    properties: {
      query_type: {
        type: 'string',
        enum: ['protocols', 'kungorelser', 'companies', 'industries'],
        description: 'Vilken tabell att söka i. Använd "industries" för att lista alla branscher.'
      },
      search_term: {
        type: 'string',
        description: 'Sökterm (bolagsnamn, org.nr, eller nyckelord)'
      },
      industry: {
        type: 'string',
        description: 'Filtrera på bransch (endast för companies). Använd exakt branschnamn som returneras från industries-frågan.'
      },
      limit: {
        type: 'number',
        description: 'Max antal resultat (default 10)'
      }
    },
    required: ['query_type']
  }
}

// Execute a simplified Supabase query
async function executeSimpleQuery(
  queryType: string,
  searchTerm?: string,
  limit: number = 10,
  industry?: string
): Promise<{ data: unknown[] | null; error: string | null }> {
  const supabase = createServerClient()
  console.log(`[DB Query] Type: ${queryType}, Search: ${searchTerm}, Industry: ${industry}, Limit: ${limit}`)

  try {
    switch (queryType) {
      case 'protocols': {
        const query = supabase
          .from('ProtocolAnalysis')
          .select('id, org_number, company_name, protocol_date, protocol_type, news_content, signals')
          .order('protocol_date', { ascending: false })
          .limit(limit)

        if (searchTerm) {
          query.ilike('company_name', `%${searchTerm}%`)
        }

        const { data, error } = await query
        console.log(`[DB Query] Protocols result: ${data?.length || 0} rows, error: ${error?.message || 'none'}`)
        if (error) throw error
        return { data, error: null }
      }

      case 'kungorelser': {
        const query = supabase
          .from('Kungorelser')
          .select('id, org_number, company_name, kategori, typ, rubrik, publicerad')
          .order('publicerad', { ascending: false })
          .limit(limit)

        if (searchTerm) {
          query.ilike('company_name', `%${searchTerm}%`)
        }

        const { data, error } = await query
        console.log(`[DB Query] Kungorelser result: ${data?.length || 0} rows, error: ${error?.message || 'none'}`)
        if (error) throw error
        return { data, error: null }
      }

      case 'companies': {
        const query = supabase
          .from('LoopBrowse_Protokoll')
          .select('orgnummer, namn, vd, ordforande, storsta_agare, stad, anstallda, omsattning, bransch')
          .limit(limit)

        // Apply industry filter if provided
        if (industry) {
          query.ilike('bransch', `%${industry}%`)
        }

        // Apply search term filter
        if (searchTerm) {
          query.ilike('namn', `%${searchTerm}%`)
        }

        const { data, error } = await query
        console.log(`[DB Query] Companies result: ${data?.length || 0} rows, error: ${error?.message || 'none'}`)
        if (error) throw error
        return { data, error: null }
      }

      case 'industries': {
        // Get all unique industries with counts
        const { data, error } = await supabase
          .from('LoopBrowse_Protokoll')
          .select('bransch')
          .not('bransch', 'is', null)
          .not('bransch', 'eq', '')

        if (error) throw error

        // Aggregate counts per industry
        const industryCounts: Record<string, number> = {}
        if (data) {
          for (const row of data) {
            const bransch = row.bransch as string
            if (bransch && bransch.trim()) {
              const normalizedBransch = bransch.trim()
              industryCounts[normalizedBransch] = (industryCounts[normalizedBransch] || 0) + 1
            }
          }
        }

        // Convert to sorted array
        const industries = Object.entries(industryCounts)
          .map(([bransch, count]) => ({ bransch, antal_bolag: count }))
          .sort((a, b) => b.antal_bolag - a.antal_bolag)
          .slice(0, limit > 0 ? limit : 50) // Default to top 50 if no limit

        console.log(`[DB Query] Industries result: ${industries.length} unique industries`)
        return { data: industries, error: null }
      }

      default:
        return { data: null, error: 'Okänd frågetyp' }
    }
  } catch (err) {
    console.error('Query error:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Databasfel' }
  }
}

/* OLD SQL-based query - kept for reference
async function executeSupabaseQuery(sql: string): Promise<{ data: unknown[] | null; error: string | null }> {
  // Safety checks
  const upperSql = sql.toUpperCase().trim()

  // Only allow SELECT queries
  if (!upperSql.startsWith('SELECT')) {
    return { data: null, error: 'Endast SELECT-frågor är tillåtna' }
  }

  // Block dangerous operations
  const blockedKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE']
  for (const keyword of blockedKeywords) {
    if (upperSql.includes(keyword)) {
      return { data: null, error: `Otillåten operation: ${keyword}` }
    }
  }

  // Ensure LIMIT exists and is reasonable
  if (!upperSql.includes('LIMIT')) {
    sql = sql.replace(/;?\s*$/, ' LIMIT 20')
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: sql })

    if (error) {
      // Fallback: try direct query on allowed tables
      console.error('RPC error, trying direct query:', error)
      return await executeDirectQuery(sql)
    }

    return { data: data as unknown[], error: null }
  } catch (err) {
    console.error('Query execution error:', err)
    return { data: null, error: err instanceof Error ? err.message : 'Okänt fel' }
  }
}

// Direct query fallback for common tables
async function executeDirectQuery(sql: string): Promise<{ data: unknown[] | null; error: string | null }> {
  const supabase = createServerClient()
  const upperSql = sql.toUpperCase()

  try {
    // Detect which table and construct appropriate query
    if (upperSql.includes('"PROTOCOLANALYSIS"') || upperSql.includes('PROTOCOLANALYSIS')) {
      const { data, error } = await supabase
        .from('ProtocolAnalysis')
        .select('*')
        .limit(20)
      if (error) throw error
      return { data, error: null }
    }

    if (upperSql.includes('"KUNGORELSER"') || upperSql.includes('KUNGORELSER')) {
      const { data, error } = await supabase
        .from('Kungorelser')
        .select('*')
        .limit(20)
      if (error) throw error
      return { data, error: null }
    }

    if (upperSql.includes('"LOOPBROWSE_PROTOKOLL"') || upperSql.includes('LOOPBROWSE_PROTOKOLL')) {
      const { data, error } = await supabase
        .from('LoopBrowse_Protokoll')
        .select('*')
        .limit(20)
      if (error) throw error
      return { data, error: null }
    }

    return { data: null, error: 'Kunde inte köra frågan - använd en av de tillgängliga tabellerna' }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Query failed' }
  }
}
*/

// Context for tool execution
interface ToolContext {
  channelId?: string
  threadTs?: string
}

// Streaming version that calls back with progressive updates
export async function generateAIResponseStreaming(
  userMessage: string,
  conversationHistory: SlackMessage[] = [],
  onUpdate: StreamCallback,
  toolContext?: ToolContext
): Promise<void> {
  try {
    // Build messages for Claude
    const messages: Anthropic.Messages.MessageParam[] = [
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ]

    const client = getAnthropic()
    let accumulatedText = ''
    let lastUpdateTime = Date.now()
    const UPDATE_INTERVAL_MS = 500

    // Tool call loop - handle multiple rounds of tool use
    let continueLoop = true
    let loopCount = 0
    const MAX_LOOPS = 5

    console.log(`[Loop-AI] Starting generation for: "${userMessage.slice(0, 50)}..."`)

    while (continueLoop && loopCount < MAX_LOOPS) {
      loopCount++
      console.log(`[Loop-AI] Loop ${loopCount}/${MAX_LOOPS}`)

      console.log(`[Loop-AI] Calling Anthropic API...`)

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: [SUPABASE_QUERY_TOOL, WEB_SEARCH_TOOL, REMINDER_TOOL, STOCK_PRICE_TOOL, CREATE_RESEARCH_THREAD_TOOL, EXPORT_DOCUMENT_TOOL, RSS_FEED_TOOL, SEARCH_PERSON_TOOL],
      })

      console.log(`[Loop-AI] Response: stop_reason=${response.stop_reason}, blocks=${response.content.length}`)

      // Collect tool results for this round
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      let hasToolUse = false

      // Process response content
      for (const block of response.content) {
        if (block.type === 'text') {
          accumulatedText += block.text

          // Update Slack with progress
          const now = Date.now()
          if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
            lastUpdateTime = now
            await onUpdate(accumulatedText + ' ...', false)
          }
        } else if (block.type === 'tool_use' && block.name === 'query_database') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: query_database`)

          const input = block.input as { query_type: string; search_term?: string; limit?: number; industry?: string }
          console.log(`[Loop-AI] Query: ${input.query_type}, search: ${input.search_term}, industry: ${input.industry}`)

          await onUpdate(accumulatedText + `\n\nSöker i databasen...`, false)

          const { data, error } = await executeSimpleQuery(
            input.query_type,
            input.search_term,
            input.limit || 10,
            input.industry
          )

          let resultContent: string
          if (error) {
            resultContent = `Fel: ${error}`
          } else if (!data || data.length === 0) {
            resultContent = 'Inga resultat hittades.'
          } else {
            resultContent = JSON.stringify(data, null, 2)
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: resultContent
          })
        } else if (block.type === 'tool_use' && block.name === 'create_reminder') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: create_reminder`)

          const input = block.input as { message: string; delay_minutes: number }
          console.log(`[Loop-AI] Reminder: "${input.message}" in ${input.delay_minutes} min`)

          if (!toolContext?.channelId) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Fel: Kan inte skapa påminnelse - kanal-ID saknas'
            })
          } else {
            await onUpdate(accumulatedText + `\n\nSkapar påminnelse...`, false)

            const result = await createReminder(
              toolContext.channelId,
              toolContext.threadTs,
              input.message,
              input.delay_minutes
            )

            if (result.success) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Påminnelse skapad! Skickas ${result.scheduled_time}`
              })
            } else {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Fel: ${result.error}`
              })
            }
          }
        } else if (block.type === 'tool_use' && block.name === 'get_stock_price') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: get_stock_price`)

          const input = block.input as { ticker: string }
          console.log(`[Loop-AI] Stock ticker: ${input.ticker}`)

          await onUpdate(accumulatedText + `\n\nHämtar aktiekurs för ${input.ticker}...`, false)

          const result = await getStockPrice(input.ticker)
          const resultContent = formatStockPriceResult(result)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: resultContent
          })
        } else if (block.type === 'tool_use' && block.name === 'create_research_thread') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: create_research_thread`)

          const input = block.input as {
            topic: string
            description: string
            research_plan?: string[]
            pin_thread?: boolean
          }
          console.log(`[Loop-AI] Research thread topic: "${input.topic}"`)

          if (!toolContext?.channelId) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Fel: Kan inte skapa research-tråd - kanal-ID saknas'
            })
          } else {
            await onUpdate(accumulatedText + `\n\nSkapar research-tråd...`, false)

            const result = await createResearchThread(
              toolContext.channelId,
              input.topic,
              input.description,
              input.research_plan,
              input.pin_thread ?? false
            )

            if (result.success) {
              let resultContent = `Research-tråd skapad!\nTråd-ID: ${result.thread_ts}`
              if (result.permalink) {
                resultContent += `\nLänk: ${result.permalink}`
              }
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultContent
              })
            } else {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Fel: ${result.error}`
              })
            }
          }
        } else if (block.type === 'tool_use' && block.name === 'export_document') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: export_document`)

          const input = block.input as { title: string; content: string }
          console.log(`[Loop-AI] Export document: "${input.title}"`)

          await onUpdate(accumulatedText + `\n\nExporterar dokument...`, false)

          const result = await exportDocument(input.title, input.content)
          const resultContent = formatExportResult(result)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: resultContent
          })
        } else if (block.type === 'tool_use' && block.name === 'fetch_rss_feed') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: fetch_rss_feed`)

          const input = block.input as { feed_url: string; limit?: number }
          console.log(`[Loop-AI] RSS Feed URL: "${input.feed_url}", limit: ${input.limit || 5}`)

          await onUpdate(accumulatedText + `\n\nHämtar RSS-flöde...`, false)

          const { items, error } = await fetchRSSFeed(input.feed_url, input.limit || 5)
          const resultContent = formatRSSFeedResult(items, error)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: resultContent
          })
        } else if (block.type === 'tool_use' && block.name === 'search_person') {
          hasToolUse = true
          console.log(`[Loop-AI] Tool use: search_person`)

          const input = block.input as { name: string }
          console.log(`[Loop-AI] Person search: "${input.name}"`)

          await onUpdate(accumulatedText + `\n\nSöker efter ${input.name}...`, false)

          const { results, error } = await searchPerson(input.name)
          const resultContent = error
            ? `Fel: ${error}`
            : formatPersonSearchResults(input.name, results)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: resultContent
          })
        }
      }

      // If there were tool uses, continue the conversation
      if (hasToolUse && toolResults.length > 0) {
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
        console.log(`[Loop-AI] Tool results added, continuing...`)
      } else {
        continueLoop = false
      }

      // Stop if model says it's done
      if (response.stop_reason === 'end_turn') {
        continueLoop = false
      }
    }

    // Send final update without cursor
    if (accumulatedText.trim()) {
      await onUpdate(accumulatedText, true)
    } else {
      await onUpdate('Jag kunde inte generera ett svar. Försök igen med en annan fråga.', true)
    }

    console.log(`[Loop-AI] Generation complete, text length: ${accumulatedText.length}`)

  } catch (error) {
    console.error('[Loop-AI] AI generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Okänt fel'
    await onUpdate(`❌ Ett fel uppstod: ${errorMessage}`, true)
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
