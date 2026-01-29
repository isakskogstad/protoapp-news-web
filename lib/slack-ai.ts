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

### 🌐 WEBBSÖKNING (web_search) - Nyhetsartiklar & Extern Info
Du har tillgång till webbsökning för att hitta EXTERNA nyheter och information.

**Använd web_search för:**
- 📰 Nyhetsartiklar från media (DI, SvD, Affärsvärlden, Breakit, etc.)
- 📢 Pressmeddelanden och bolagsmeddelanden
- 👤 Information om personer (VD:ar, styrelseledamöter, ägare)
- 🏢 Branschanalys och marknadstrender
- ✅ Verifiera och komplettera intern data
- 🔍 Allt som inte finns i vår databas

**Sök ALLTID på webben när användaren:**
- Frågar om "nyheter", "artiklar", "vad skrivs om"
- Vill veta mer om en person (bakgrund, karriär)
- Frågar om bransch- eller marknadstrender
- Behöver extern bekräftelse på information
- Frågar om något aktuellt som kan ha ändrats

**Sökstrategi:**
1. Använd bolagsnamn + nyckelord: "H&M nyemission 2024"
2. För personer: "Marcus Wallenberg styrelseuppdrag"
3. För branscher: "fintech Sverige konkurs 2024"

**VIKTIGT:** Ange ALLTID källa när du citerar webbresultat!

## SVARSFORMAT

**Kort fråga** → Kort svar (1-3 meningar)
**Sök/lista** → Punktlista med bolagsnamn (org.nr)
**Skriv notis** → Rubrik + ingress + brödtext i korrekt format
**Analys** → Strukturerad sammanfattning med rubriker

## NÄR ANVÄNDA VILKET VERKTYG

**query_database** (Supabase) - Intern data:
- Protokolldata, styrelseinfo, kapitalåtgärder
- Kungörelser (konkurser, likvidationer)
- Bolagsregister (VD, ordförande, ägare, stad)
- Signaler och AI-analyserad data
- Historisk data från vårt arkiv

**web_search** - Extern data:
- Nyhetsartiklar från media
- Pressmeddelanden
- Personbakgrund och karriär
- Marknadsanalys och trender
- Aktuell information utanför databasen

**Kombinera verktygen!** T.ex: Hämta protokolldata från databasen, sök sedan på webben efter relaterade nyhetsartiklar.

## REGLER
1. Svara ALLTID på svenska
2. Var koncis – reportrar har bråttom
3. Inkludera ALLTID org.nummer vid första omnämnande
4. Säg ärligt om du inte hittar information
5. Skilja på fakta (från databas) och analys (din tolkning)
6. Vid osäkerhet, föreslå vad reportern kan undersöka vidare
7. Ange ALLTID källa för webbresultat

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

// Web search tool definition for Claude
// NOTE: Temporarily disabled due to SDK compatibility issues
// TODO: Re-enable when stable
// const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20250305 = {
//   type: 'web_search_20250305',
//   name: 'web_search',
//   max_uses: 3,
// }

// Custom Supabase query tool for Claude
// NOTE: Temporarily disabled while debugging basic chat
/*
const SUPABASE_QUERY_TOOL: Anthropic.Messages.Tool = {
  name: 'query_database',
  description: `Kör en databasfråga mot LoopDesk-arkivet. Använd PostgreSQL-syntax. Begränsa alltid till max 20 rader med LIMIT.

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
      sql: {
        type: 'string',
        description: 'SQL SELECT-fråga (endast läsning, max 20 rader)'
      },
      explanation: {
        type: 'string',
        description: 'Kort förklaring av vad frågan gör (för loggning)'
      }
    },
    required: ['sql', 'explanation']
  }
}
*/

/* Temporarily disabled while debugging basic chat
// Execute a Supabase query from Claude
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
    // Detect intent and query database (initial context)
    const intent = detectQueryIntent(userMessage)
    let databaseContext = ''

    if (intent.type !== 'general') {
      const result = await queryDatabase(intent)
      if (result) {
        databaseContext = `\n\n--- DATABASRESULTAT (automatisk sökning) ---\n${formatResultsForAI(result)}\n--- SLUT DATABASRESULTAT ---\n`
      }
    }

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

      console.log(`[Loop-AI] Calling Anthropic API with model claude-sonnet-4-20250514...`)
      console.log(`[Loop-AI] Messages count: ${messages.length}`)

      // Minimal API call - no tools, no extra options
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: messages,
      })

      console.log(`[Loop-AI] API call successful, stop_reason: ${response.stop_reason}`)

      console.log(`[Loop-AI] Response stop_reason: ${response.stop_reason}, content blocks: ${response.content.length}`)

      // Process response content - extract text from response
      for (const block of response.content) {
        console.log(`[Loop-AI] Processing block type: ${block.type}`)

        if (block.type === 'text') {
          accumulatedText += block.text

          // Update Slack with progress
          const now = Date.now()
          if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
            lastUpdateTime = now
            await onUpdate(accumulatedText + ' ▌', false)
          }
        }
      }

      // No tools enabled, so we're done after first response
      continueLoop = false
      console.log(`[Loop-AI] Response processed, stop_reason: ${response.stop_reason}`)
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
