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

*web_search* - Sök på internet efter:
- Nyhetsartiklar från media (DI, SvD, Breakit, etc.)
- Pressmeddelanden
- Information om personer och bolag
- Aktuella händelser

Använd web_search när användaren frågar om nyheter, artiklar, eller information som inte finns i databasen.`

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
WHERE kategori = 'konkurser' ORDER BY publicerad DESC LIMIT 10`,
  input_schema: {
    type: 'object' as const,
    properties: {
      query_type: {
        type: 'string',
        enum: ['protocols', 'kungorelser', 'companies'],
        description: 'Vilken tabell att söka i'
      },
      search_term: {
        type: 'string',
        description: 'Sökterm (bolagsnamn, org.nr, eller nyckelord)'
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
  limit: number = 10
): Promise<{ data: unknown[] | null; error: string | null }> {
  const supabase = createServerClient()
  console.log(`[DB Query] Type: ${queryType}, Search: ${searchTerm}, Limit: ${limit}`)

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
          .select('orgnummer, namn, vd, ordforande, storsta_agare, stad, anstallda, omsattning')
          .limit(limit)

        if (searchTerm) {
          query.ilike('namn', `%${searchTerm}%`)
        }

        const { data, error } = await query
        console.log(`[DB Query] Companies result: ${data?.length || 0} rows, error: ${error?.message || 'none'}`)
        if (error) throw error
        return { data, error: null }
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

// Streaming version that calls back with progressive updates
export async function generateAIResponseStreaming(
  userMessage: string,
  conversationHistory: SlackMessage[] = [],
  onUpdate: StreamCallback
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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: [SUPABASE_QUERY_TOOL, WEB_SEARCH_TOOL],
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

          const input = block.input as { query_type: string; search_term?: string; limit?: number }
          console.log(`[Loop-AI] Query: ${input.query_type}, search: ${input.search_term}`)

          await onUpdate(accumulatedText + `\n\nSöker i databasen...`, false)

          const { data, error } = await executeSimpleQuery(
            input.query_type,
            input.search_term,
            input.limit || 10
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
