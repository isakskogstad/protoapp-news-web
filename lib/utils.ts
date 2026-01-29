import { formatDistanceToNow, format, parseISO, isFuture, isValid } from 'date-fns'
import { sv } from 'date-fns/locale'
import { EventType, NewsItem, ProtocolAnalysis, Kungorelse } from './types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rpjmsncjnhtnjnycabys.supabase.co'

/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLogoUrl(_orgNumber: string, logoUrl?: string): string {
  // Return provided logo URL if it exists and is valid
  if (logoUrl && !logoUrl.includes('undefined')) return logoUrl

  // Return empty string - component should handle fallback to initials
  // This avoids 404 errors from non-existent bucket/files
  return ''
}

// Format org number with hyphen: 5565859484 -> 556585-9484
export function formatOrgNumber(org: string): string {
  if (!org) return ''
  // Remove any existing hyphens/spaces
  const cleaned = org.replace(/[-\s]/g, '')
  // If it's 10 digits, format as XXXXXX-XXXX
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`
  }
  // Return as-is if already formatted or invalid
  return org
}

// Truncate text to a maximum number of words
export function truncateWords(text: string, maxWords: number): string {
  if (!text) return ''
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '...'
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return formatDistanceToNow(date, { addSuffix: true, locale: sv })
  } catch {
    return dateString
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'd MMM yyyy HH:mm', { locale: sv })
  } catch {
    return dateString
  }
}

export function formatProtocolType(type?: string): string {
  if (!type) return 'Protokoll'
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase())
}

export function formatSignalName(signal?: string): string {
  if (!signal) return ''
  return signal
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase())
}

export function formatOmsattning(raw?: string): string {
  if (!raw) return ''
  const cleaned = raw.replace(/\s/g, '').replace(/tkr|kr/gi, '').replace(/,/g, '')
  const value = parseFloat(cleaned)
  if (isNaN(value)) return raw
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} mkr`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} mkr`
  return raw
}

export function detectEventType(item: NewsItem): EventType | null {
  // Check kungorelse first
  if (item.kungorelse) {
    const amnesomrade = item.kungorelse.amnesomrade?.toLowerCase() || ''
    const typ = item.kungorelse.typ?.toLowerCase() || ''
    if (amnesomrade.includes('konkurs')) return 'konkurs'
    if (typ.includes('rekonstruktion')) return 'rekonstruktion'
  }

  // Check signals
  if (item.signals?.detekterade) {
    for (const signal of item.signals.detekterade) {
      const name = signal.signal?.toLowerCase() || ''
      if (name.includes('konkurs')) return 'konkurs'
      if (name.includes('nyemission') || name.includes('emission')) return 'nyemission'
      if (name.includes('vd') && name.includes('byte')) return 'vdbyte'
      if (name.includes('styrelse')) return 'styrelseforandring'
      if (name.includes('rekonstruktion')) return 'rekonstruktion'
    }
  }

  // Check headline
  if (item.headline) {
    const headline = item.headline.toLowerCase()
    if (headline.includes('konkurs')) return 'konkurs'
    if (headline.includes('nyemission') || headline.includes('emission')) return 'nyemission'
    if (headline.includes('ny vd') || headline.includes('vd avgår')) return 'vdbyte'
    if (headline.includes('styrelse')) return 'styrelseforandring'
    if (headline.includes('rekonstruktion')) return 'rekonstruktion'
  }

  return null
}

/**
 * Map protocol_type string to storage category folder name
 * Must match Swift's ProtocolCategory.from(aiProtocolType:) exactly
 */
export function mapProtocolTypeToCategory(protocolType?: string): string {
  if (!protocolType) return 'okand'

  const pType = protocolType.toLowerCase()

  // Check in same order as Swift
  if (pType.includes('per capsulam') || pType.includes('percapsulam')) {
    return 'per_capsulam'
  }
  if (pType.includes('styrelsemöte') || pType.includes('styrelseprotokoll') || pType.includes('styrelsem')) {
    return 'styrelsemote'
  }
  if (pType.includes('extra bolagsstämma') || pType.includes('extra stämma') || pType.includes('extra_bolagsstamma')) {
    return 'extra_bolagsstamma'
  }
  if (pType.includes('årsstämma') || pType.includes('ordinarie') || pType.includes('arsstamma')) {
    return 'arsstamma'
  }
  if (pType.includes('bolagsstämma')) {
    return 'arsstamma'
  }

  return 'okand'
}

export function protocolToNewsItem(analysis: ProtocolAnalysis): NewsItem {
  // Use storage_path from database if available, otherwise generate URL
  let sourceUrl: string | undefined

  if (analysis.storage_path) {
    // Use the actual storage path from the database
    sourceUrl = `${SUPABASE_URL}/storage/v1/object/public/Protokoll/${analysis.storage_path}`
  } else {
    // Fallback: Generate PDF source URL (legacy behavior)
    const cleanOrg = (analysis.org_number || '').replace(/-/g, '')
    const protocolDate = analysis.protocol_date || ''
    const category = mapProtocolTypeToCategory(analysis.protocol_type)

    sourceUrl = cleanOrg && protocolDate
      ? `${SUPABASE_URL}/storage/v1/object/public/Protokoll/protokoll/${category}/${cleanOrg}/${protocolDate}.pdf`
      : undefined
  }

  // Extract event date (stämmodatum) from extracted_data.metadata.datum
  const metadataData = analysis.extracted_data?.metadata as Record<string, unknown> | undefined
  const eventDate = (metadataData?.datum as string) || undefined

  const item: NewsItem = {
    id: analysis.id,
    type: 'protocol',
    companyName: analysis.company_name || 'Okänt bolag',
    orgNumber: analysis.org_number || '',
    headline: analysis.news_content?.rubrik,
    noticeText: analysis.news_content?.notistext,
    protocolType: analysis.protocol_type,
    eventDate,
    newsValue: analysis.news_content?.nyckeldata?.nyhetsvärde || analysis.signals?.nyhetsvärde_total,
    timestamp: analysis.analyzed_at || new Date().toISOString(),
    logoUrl: analysis.logo_url,
    signals: analysis.signals,
    extractedData: analysis.extracted_data,
    calculations: analysis.calculations,
    sourceUrl,
    sourceType: 'pdf',
  }

  // Extract nyemission faktaruta from extracted_data
  const nyemission = analysis.extracted_data?.kapitalåtgärder?.nyemission
  if (nyemission && nyemission.beslutad) {
    // Get emissionsbelopp from multiple sources (calculations.emission or extracted_data, or calculate)
    const emissionCalc = (analysis.calculations as Record<string, unknown>)?.emission as Record<string, unknown> | undefined
    const emissionsbeloppKr =
      emissionCalc?.emissionsbelopp_kr as number | undefined ||
      nyemission.emissionsbelopp_kr ||
      (nyemission.antal_nya_aktier && nyemission.teckningskurs_kr
        ? nyemission.antal_nya_aktier * nyemission.teckningskurs_kr
        : null)

    // Get utspädning from calculations.utspädning.utspädning_procent
    const utspädningCalc = (analysis.calculations as Record<string, unknown>)?.utspädning as Record<string, unknown> | undefined
    const utspädningProcent = utspädningCalc?.utspädning_procent as number | undefined

    // Format emission type: "riktad_emission" -> "Riktad emission"
    const formatEmissionstyp = (typ?: string): string => {
      if (!typ) return 'Nyemission'
      return typ
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase())
    }

    item.nyemissionFaktaruta = {
      bolagsnamn: analysis.company_name || '',
      emissionstyp: formatEmissionstyp(nyemission.typ),
      antalAktier: nyemission.antal_nya_aktier ? nyemission.antal_nya_aktier.toLocaleString('sv-SE') : '-',
      teckningskurs: nyemission.teckningskurs_kr ? `${nyemission.teckningskurs_kr.toLocaleString('sv-SE')} kr` : '-',
      emissionsbelopp: emissionsbeloppKr ? `${(emissionsbeloppKr / 1_000_000).toFixed(1)} mkr` : '-',
      utspädning: utspädningProcent ? `${utspädningProcent.toFixed(1)}%` : '-',
      teckningsperiod: '',
    }
  }

  // Extract styrelse faktaruta from extracted_data
  const styrelse = analysis.extracted_data?.styrelse
  if (styrelse && (styrelse.tillträdande_ledamöter?.length || styrelse.avgående_ledamöter?.length || styrelse.ordförande)) {
    item.styrelseFaktaruta = {
      bolagsnamn: analysis.company_name || '',
      nyaLedamoter: styrelse.tillträdande_ledamöter?.map(l => l.namn || '').filter(Boolean) || [],
      avgaendeLedamoter: styrelse.avgående_ledamöter?.map(l => l.namn || '').filter(Boolean) || [],
      nyOrdforande: styrelse.ordförande || '',
      beslutsdatum: analysis.protocol_date || '',
    }
  }

  // Extract kallelse faktaruta if protocol type indicates meeting invitation
  // ONLY if the meeting date is in the future
  const protocolType = (analysis.protocol_type || '').toLowerCase()
  if (protocolType.includes('kallelse') || protocolType.includes('stämma')) {
    const meetingDate = analysis.protocol_date || ''
    // Only show kallelse faktaruta for future meetings
    if (isFutureDate(meetingDate)) {
      item.kallelseFaktaruta = {
        bolagsnamn: analysis.company_name || '',
        stammatyp: analysis.protocol_type || 'Bolagsstämma',
        datum: meetingDate,
        tid: '',
        plats: analysis.extracted_data?.bolag?.säte || '',
      }
    }
  }

  return item
}

export function kungorelseToNewsItem(k: Kungorelse): NewsItem {
  // For kungörelser, we don't have a direct PDF link but can link to PoIT
  // The kungorelsetext itself is the source content
  // Prefer AI-generated headline/notice_text if available
  const item: NewsItem = {
    id: k.id,
    type: 'kungorelse',
    companyName: k.company_name || 'Okänt bolag',
    orgNumber: k.org_number || '',
    headline: k.ai_headline || k.underrubrik || k.typ,
    noticeText: k.ai_notice_text || k.kungorelsetext,
    protocolType: k.amnesomrade,
    newsValue: k.amnesomrade?.toLowerCase().includes('konkurs') ? 9 : 5,
    timestamp: k.publicerad || new Date().toISOString(),
    kungorelse: k,
    sourceType: 'kungorelse',
  }

  // Extract konkurs faktaruta from kungörelse
  const amnesomrade = (k.amnesomrade || '').toLowerCase()
  if (amnesomrade.includes('konkurs')) {
    item.konkursFaktaruta = {
      bolagsnamn: k.company_name || '',
      beslutsdatum: k.datum_konkursbeslut || k.publicerad || '',
      tingsratt: k.konkurs_data?.tingsratt || `${k.lan || ''} tingsrätt`.trim(),
      konkursforvaltare: k.konkurs_data?.konkursforvaltare || '',
      forvaltarbyra: '',
      bevakningsfrist: '',
    }
  }

  // Extract kallelse faktaruta if kungörelse is about meeting invitation
  // ONLY if the meeting date is in the future
  const typ = (k.typ || '').toLowerCase()
  if (typ.includes('kallelse') || typ.includes('stämma')) {
    // Try to extract date from stamma_data if available
    const stammaData = k as { stamma_data?: { datum?: string } }
    const meetingDate = stammaData.stamma_data?.datum || ''

    // Only show kallelse faktaruta for future meetings
    if (isFutureDate(meetingDate)) {
      item.kallelseFaktaruta = {
        bolagsnamn: k.company_name || '',
        stammatyp: k.typ || 'Bolagsstämma',
        datum: meetingDate,
        tid: '',
        plats: k.ort || '',
      }
    }
  }

  return item
}

export function getNewsValueColor(value?: number): string {
  if (!value) return 'bg-gray-100 text-gray-600'
  if (value >= 7) return 'bg-red-100 text-red-700'
  if (value >= 4) return 'bg-orange-100 text-orange-700'
  return 'bg-green-100 text-green-700'
}

export function getEventTypeColor(type: EventType): string {
  const colors: Record<EventType, string> = {
    konkurs: 'bg-red-500',
    nyemission: 'bg-green-500',
    styrelseforandring: 'bg-purple-500',
    vdbyte: 'bg-orange-500',
    rekonstruktion: 'bg-yellow-500',
  }
  return colors[type] || 'bg-gray-500'
}

// Parse various Swedish date formats and check if the date is in the future
export function isFutureDate(dateStr?: string): boolean {
  if (!dateStr) return false

  try {
    // Try ISO format first (2024-03-15 or 2024-03-15T...)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = parseISO(dateStr.split('T')[0])
      return isValid(parsed) && isFuture(parsed)
    }

    // Try Swedish format: "15 mars 2024"
    const swedishMonths: Record<string, number> = {
      januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
      juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11
    }

    const swedishMatch = dateStr.match(/(\d{1,2})\s*(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s*(\d{4})/i)
    if (swedishMatch) {
      const day = parseInt(swedishMatch[1], 10)
      const month = swedishMonths[swedishMatch[2].toLowerCase()]
      const year = parseInt(swedishMatch[3], 10)
      const parsed = new Date(year, month, day)
      return isValid(parsed) && isFuture(parsed)
    }

    // Try slash format: 15/3/2024
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10)
      const month = parseInt(slashMatch[2], 10) - 1
      const year = parseInt(slashMatch[3], 10)
      const parsed = new Date(year, month, day)
      return isValid(parsed) && isFuture(parsed)
    }

    return false
  } catch {
    return false
  }
}
