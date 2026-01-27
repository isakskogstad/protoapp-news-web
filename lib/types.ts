// News item types matching Supabase schema

export interface NewsContent {
  rubrik?: string
  notistext?: string
  nyckeldata?: {
    nyhetsvärde?: number
    [key: string]: unknown
  }
}

export interface DetectedSignal {
  signal?: string
  styrka?: string
  motivering?: string
}

export interface AnalysisSignals {
  detekterade?: DetectedSignal[]
  nyhetsvärde_total?: number
  varningsflaggor?: string[]
  brådska_indikator?: string
}

export interface StyrelseData {
  ordförande?: string
  tillträdande_ledamöter?: Array<{ namn?: string; roll?: string }>
  avgående_ledamöter?: Array<{ namn?: string; roll?: string }>
}

export interface NyemissionData {
  beslutad?: boolean
  typ?: string
  antal_nya_aktier?: number
  teckningskurs_kr?: number
  emissionsbelopp_kr?: number
}

export interface ExtractedData {
  bolag?: {
    namn?: string
    organisationsnummer?: string
    säte?: string
  }
  styrelse?: StyrelseData
  kapitalåtgärder?: {
    nyemission?: NyemissionData
  }
  [key: string]: unknown
}

export interface AnalysisCalculations {
  utspädning_procent?: number
  värdering_pre?: number
  värdering_post?: number
  [key: string]: unknown
}

export interface ProtocolAnalysis {
  id: string
  org_number?: string
  company_name?: string
  protocol_type?: string
  protocol_date?: string
  news_content?: NewsContent
  signals?: AnalysisSignals
  extracted_data?: ExtractedData
  calculations?: AnalysisCalculations
  analyzed_at?: string
  logo_url?: string
}

export interface Kungorelse {
  id: string
  org_number?: string
  company_name?: string
  amnesomrade?: string
  typ?: string
  underrubrik?: string
  kungorelsetext?: string
  publicerad?: string
  lan?: string
  ort?: string
  datum_konkursbeslut?: string
  konkurs_data?: {
    tingsratt?: string
    konkursforvaltare?: string
  }
}

// Faktaruta types for detailed news displays

export interface BolagsInfo {
  anstallda: number
  startat: string
  omsattning: string
  omsattningAr: number
  vd: string
}

export interface KallelseFaktaruta {
  bolagsnamn: string
  stammatyp: string
  datum: string
  tid: string
  plats: string
}

export interface KonkursFaktaruta {
  bolagsnamn: string
  beslutsdatum: string
  tingsratt: string
  konkursforvaltare: string
  forvaltarbyra: string
  bevakningsfrist: string
}

export interface NyemissionFaktaruta {
  bolagsnamn: string
  emissionstyp: string
  antalAktier: string
  teckningskurs: string
  emissionsbelopp: string
  utspädning: string
  teckningsperiod: string
}

export interface StyrelseFaktaruta {
  bolagsnamn: string
  nyaLedamoter: string[]
  avgaendeLedamoter: string[]
  nyOrdforande: string
  beslutsdatum: string
}

export interface NewsItem {
  id: string
  type: 'protocol' | 'kungorelse'
  companyName: string
  orgNumber: string
  headline?: string
  noticeText?: string
  protocolType?: string
  newsValue?: number
  timestamp: string
  logoUrl?: string
  signals?: AnalysisSignals
  extractedData?: ExtractedData
  calculations?: AnalysisCalculations
  kungorelse?: Kungorelse
  bolagsInfo?: BolagsInfo
  kallelseFaktaruta?: KallelseFaktaruta
  konkursFaktaruta?: KonkursFaktaruta
  nyemissionFaktaruta?: NyemissionFaktaruta
  styrelseFaktaruta?: StyrelseFaktaruta
}

export interface ImpactLoopArticle {
  title: string
  url: string
  publishedDate?: string
  author?: string
  excerpt?: string
}

export interface ImpactLoopSearchResult {
  query: string
  resultCount: number
  totalMatches: number
  articles: ImpactLoopArticle[]
}

// Event types for webhook/UI
export type EventType = 'konkurs' | 'nyemission' | 'styrelseforandring' | 'vdbyte' | 'rekonstruktion'

export const eventTypeConfig: Record<EventType, { emoji: string; label: string; color: string }> = {
  konkurs: { emoji: '🔴', label: 'Konkurs', color: '#dc3545' },
  nyemission: { emoji: '💰', label: 'Nyemission', color: '#28a745' },
  styrelseforandring: { emoji: '👥', label: 'Styrelseförändring', color: '#6f42c1' },
  vdbyte: { emoji: '👔', label: 'VD-byte', color: '#fd7e14' },
  rekonstruktion: { emoji: '⚠️', label: 'Rekonstruktion', color: '#ffc107' },
}
