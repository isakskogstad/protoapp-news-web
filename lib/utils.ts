import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { EventType, NewsItem, ProtocolAnalysis, Kungorelse } from './types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rpjmsncjnhtnjnycabys.supabase.co'

export function getLogoUrl(orgNumber: string, logoUrl?: string): string {
  if (logoUrl) return logoUrl
  const cleanOrg = orgNumber.replace(/-/g, '')
  return `${SUPABASE_URL}/storage/v1/object/public/company-assets/logos/${cleanOrg}.png`
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
    .replace(/\b\w/g, l => l.toUpperCase())
}

export function formatSignalName(signal?: string): string {
  if (!signal) return ''
  return signal
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
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

export function protocolToNewsItem(analysis: ProtocolAnalysis): NewsItem {
  return {
    id: analysis.id,
    type: 'protocol',
    companyName: analysis.company_name || 'Okänt bolag',
    orgNumber: analysis.org_number || '',
    headline: analysis.news_content?.rubrik,
    noticeText: analysis.news_content?.notistext,
    protocolType: analysis.protocol_type,
    newsValue: analysis.news_content?.nyckeldata?.nyhetsvärde || analysis.signals?.nyhetsvärde_total,
    timestamp: analysis.analyzed_at || new Date().toISOString(),
    logoUrl: analysis.logo_url,
    signals: analysis.signals,
    extractedData: analysis.extracted_data,
    calculations: analysis.calculations,
  }
}

export function kungorelseToNewsItem(k: Kungorelse): NewsItem {
  return {
    id: k.id,
    type: 'kungorelse',
    companyName: k.company_name || 'Okänt bolag',
    orgNumber: k.org_number || '',
    headline: k.underrubrik || k.typ,
    noticeText: k.kungorelsetext,
    protocolType: k.amnesomrade,
    newsValue: k.amnesomrade?.toLowerCase().includes('konkurs') ? 9 : 5,
    timestamp: k.publicerad || new Date().toISOString(),
    kungorelse: k,
  }
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
