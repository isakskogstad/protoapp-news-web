'use client'

import { useState, useEffect, useRef } from 'react'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatDate, getLogoUrl, detectEventType, formatOrgNumber } from '@/lib/utils'
import { FileText, Clock, Building2, Download, Loader2, ChevronDown, ChevronUp, X, FileX, AlertCircle } from 'lucide-react'
import WatchCompanyButton from './WatchCompanyButton'
import BolagsInfoCard from './BolagsInfoCard'
import NyemissionFaktaruta from './NyemissionFaktaruta'
import KonkursFaktaruta from './KonkursFaktaruta'
import StyrelseFaktaruta from './StyrelseFaktaruta'
import KallelseFaktaruta from './KallelseFaktaruta'
import BolagsfaktaModule from './BolagsfaktaModule'
import ArsredovisningarModule from './ArsredovisningarModule'
import ShareToChat from './ShareToChat'
import NewsSidebar from './NewsSidebar'
import ImpactLoopModule from './ImpactLoopModule'
import PDFPreview, { PDFKeyword } from './PDFPreview'

// Helper function to extract keywords from NewsItem for PDF search
function extractKeywords(item: NewsItem): PDFKeyword[] {
  const keywords: PDFKeyword[] = []

  // Company name
  if (item.companyName) {
    keywords.push({ label: 'Bolag', value: item.companyName, category: 'company' })
  }

  // Org number (formatted)
  if (item.orgNumber) {
    const formatted = item.orgNumber.replace(/(\d{6})(\d{4})/, '$1-$2')
    keywords.push({ label: 'Org.nr', value: formatted, category: 'company' })
  }

  // Event date
  if (item.eventDate) {
    keywords.push({ label: 'Datum', value: item.eventDate, category: 'date' })
  }

  // Nyemission data
  if (item.nyemissionFaktaruta) {
    const nf = item.nyemissionFaktaruta
    if (nf.antalAktier && nf.antalAktier !== '-') {
      keywords.push({ label: 'Antal aktier', value: nf.antalAktier, category: 'amount' })
    }
    if (nf.teckningskurs && nf.teckningskurs !== '-') {
      keywords.push({ label: 'Teckningskurs', value: nf.teckningskurs, category: 'amount' })
    }
    if (nf.emissionsbelopp && nf.emissionsbelopp !== '-') {
      keywords.push({ label: 'Emissionsbelopp', value: nf.emissionsbelopp, category: 'amount' })
    }
    if (nf.utspädning && nf.utspädning !== '-') {
      keywords.push({ label: 'Utspädning', value: nf.utspädning, category: 'amount' })
    }
  }

  // Styrelse data - names
  if (item.styrelseFaktaruta) {
    const sf = item.styrelseFaktaruta
    if (sf.nyaLedamoter && sf.nyaLedamoter.length > 0) {
      sf.nyaLedamoter.forEach(name => {
        if (name && name !== '-') {
          keywords.push({ label: 'Ny ledamot', value: name, category: 'name' })
        }
      })
    }
    if (sf.avgaendeLedamoter && sf.avgaendeLedamoter.length > 0) {
      sf.avgaendeLedamoter.forEach(name => {
        if (name && name !== '-') {
          keywords.push({ label: 'Avg. ledamot', value: name, category: 'name' })
        }
      })
    }
    if (sf.nyOrdforande && sf.nyOrdforande !== '-') {
      keywords.push({ label: 'Ny ordforande', value: sf.nyOrdforande, category: 'name' })
    }
  }

  // Kallelse data
  if (item.kallelseFaktaruta) {
    const kf = item.kallelseFaktaruta
    if (kf.datum && kf.datum !== '-') {
      keywords.push({ label: 'Stämmodatum', value: kf.datum, category: 'date' })
    }
    if (kf.plats && kf.plats !== '-') {
      keywords.push({ label: 'Plats', value: kf.plats, category: 'other' })
    }
  }

  // Konkurs data
  if (item.konkursFaktaruta) {
    const konk = item.konkursFaktaruta
    if (konk.beslutsdatum && konk.beslutsdatum !== '-') {
      keywords.push({ label: 'Beslutsdatum', value: konk.beslutsdatum, category: 'date' })
    }
    if (konk.konkursforvaltare && konk.konkursforvaltare !== '-') {
      keywords.push({ label: 'Forvaltare', value: konk.konkursforvaltare, category: 'name' })
    }
  }

  // Extract from extractedData if available
  if (item.extractedData) {
    const ed = item.extractedData

    // Styrelse from extracted data
    if (ed.styrelse) {
      if (ed.styrelse.ordförande) {
        keywords.push({ label: 'Ordforande', value: ed.styrelse.ordförande, category: 'name' })
      }
      ed.styrelse.tillträdande_ledamöter?.forEach(l => {
        if (l.namn) {
          keywords.push({ label: 'Tilltradande', value: l.namn, category: 'name' })
        }
      })
      ed.styrelse.avgående_ledamöter?.forEach(l => {
        if (l.namn) {
          keywords.push({ label: 'Avgaende', value: l.namn, category: 'name' })
        }
      })
    }

    // Nyemission from extracted data
    if (ed.kapitalåtgärder?.nyemission) {
      const ne = ed.kapitalåtgärder.nyemission
      if (ne.antal_nya_aktier) {
        keywords.push({ label: 'Nya aktier', value: ne.antal_nya_aktier.toLocaleString('sv-SE'), category: 'amount' })
      }
      if (ne.teckningskurs_kr) {
        keywords.push({ label: 'Teckningskurs', value: `${ne.teckningskurs_kr.toLocaleString('sv-SE')} kr`, category: 'amount' })
      }
      if (ne.emissionsbelopp_kr) {
        keywords.push({ label: 'Emissionsbelopp', value: `${ne.emissionsbelopp_kr.toLocaleString('sv-SE')} kr`, category: 'amount' })
      }
    }
  }

  // Remove duplicates based on value
  const seen = new Set<string>()
  return keywords.filter(kw => {
    const key = kw.value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface NewsDetailProps {
  item: NewsItem
  showNewsSidebar?: boolean
}

export default function NewsDetail({ item, showNewsSidebar = true }: NewsDetailProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const [sourceExpanded, setSourceExpanded] = useState(false)
  const [fullscreenPdf, setFullscreenPdf] = useState(false)
  const [kungorelseExpanded, setKungorelseExpanded] = useState(false)
  // PDF availability: null = checking, true = exists, false = missing
  const [pdfExists, setPdfExists] = useState<boolean | null>(null)
  const [pdfChecking, setPdfChecking] = useState(false)

  const expandedContentRef = useRef<HTMLDivElement>(null)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Close fullscreen PDF on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fullscreenPdf && expandedContentRef.current && !expandedContentRef.current.contains(e.target as Node)) {
        setFullscreenPdf(false)
      }
    }

    if (fullscreenPdf) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [fullscreenPdf])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenPdf(false)
        setSourceExpanded(false)
        setKungorelseExpanded(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Check if PDF exists via HEAD request
  useEffect(() => {
    const checkPdfExists = async () => {
      if (item.sourceType !== 'pdf' || !item.sourceUrl) {
        setPdfExists(null)
        return
      }

      setPdfChecking(true)
      try {
        const response = await fetch(item.sourceUrl, { method: 'HEAD' })
        setPdfExists(response.ok)
      } catch {
        // Network error - assume PDF doesn't exist
        setPdfExists(false)
      } finally {
        setPdfChecking(false)
      }
    }

    checkPdfExists()
  }, [item.sourceUrl, item.sourceType])

  // Determine content availability
  const hasPdfUrl = item.sourceType === 'pdf' && !!item.sourceUrl
  // Show PDF viewer unless we've confirmed it's missing (pdfExists === false)
  const hasPdf = hasPdfUrl && pdfExists !== false
  const hasKungorelse = item.sourceType === 'kungorelse'
  const hasBolagsInfo = !!item.bolagsInfo
  const hasKallelse = !!item.kallelseFaktaruta
  const hasNyemission = !!item.nyemissionFaktaruta
  const hasKonkurs = !!item.konkursFaktaruta
  const hasStyrelse = !!item.styrelseFaktaruta

  // Get the primary faktaruta (first one that exists)
  const hasFaktaruta = hasKallelse || hasNyemission || hasKonkurs || hasStyrelse
  // Show source section if we have kungorelse, or if we have a PDF URL
  const hasSource = hasPdfUrl || hasKungorelse
  // PDF is confirmed missing only after HEAD check returns false
  const pdfConfirmedMissing = hasPdfUrl && pdfExists === false

  // Extract keywords for PDF search
  const pdfKeywords = hasPdf ? extractKeywords(item) : []

  return (
    <article className="animate-fade-in overflow-x-hidden">
      {/* Header - mobile responsive */}
      <header className="mb-6 sm:mb-8">
        <div className="flex items-start gap-3 sm:gap-5 mb-4 sm:mb-5">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center">
            {logoLoading && !logoError && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 skeleton-shimmer rounded-xl" />
            )}
            {!logoError ? (
              <img
                src={logoUrl}
                alt=""
                className={`w-full h-full object-contain rounded-xl transition-opacity duration-300 ${logoLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setLogoLoading(false)}
                onError={() => {
                  setLogoError(true)
                  setLogoLoading(false)
                }}
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400 font-semibold text-sm">
                  {item.companyName.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {eventConfig && (
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-mono font-medium uppercase tracking-wide whitespace-nowrap"
                  style={{ backgroundColor: `${eventConfig.color}15`, color: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#e6edf3] leading-tight truncate">
                {item.companyName}
              </h1>
              <WatchCompanyButton
                orgNumber={item.orgNumber}
                companyName={item.companyName}
                className="flex-shrink-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-[11px] sm:text-xs font-mono text-[#64748b] dark:text-[#8b949e]">
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{formatOrgNumber(item.orgNumber)}</span>
              </span>
              <span className="w-px h-3 bg-gray-300 dark:bg-[#30363d] hidden sm:block" />
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{formatDate(item.timestamp)}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Headline with Share button - mobile responsive */}
      <div className="mb-6">
        {item.headline && (
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a] dark:text-[#e6edf3] leading-[1.2] mb-4">
            {item.headline}
          </h2>
        )}
        <ShareToChat
          companyName={item.companyName}
          headline={item.headline}
          newsId={item.id}
          className="w-full sm:w-auto inline-flex justify-center px-4 py-2.5 sm:px-3 sm:py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm sm:text-xs font-medium"
        />
      </div>

      {/* Notice text - prominent, mobile responsive */}
      {item.noticeText && !hasKungorelse && (
        <div className="mb-6 sm:mb-10 pb-6 sm:pb-10 border-b border-gray-200/60 dark:border-[#30363d]">
          <p className="text-[#334155] dark:text-[#c9d1d9] leading-[1.8] sm:leading-[1.9] text-[15px] sm:text-[17px] whitespace-pre-wrap">
            {item.noticeText}
          </p>
        </div>
      )}

      {/* Bolagsinformation - visas direkt under notisen */}
      {hasBolagsInfo && (
        <div className="mb-6">
          <BolagsInfoCard data={item.bolagsInfo} />
        </div>
      )}

      {/* ========== COLLAPSIBLE SOURCE BAR (Protokoll/Kungörelse) - mobile responsive ========== */}
      {hasSource && (
        <div className="mb-6 sm:mb-8">
          {/* Collapsible header bar - full width, refined */}
          <button
            onClick={() => {
              if (hasKungorelse) {
                setKungorelseExpanded(!kungorelseExpanded)
              } else if (hasPdfUrl) {
                setSourceExpanded(!sourceExpanded)
              }
            }}
            className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between hover:bg-[#f8fafc] dark:hover:bg-[#21262d] hover:border-[#1e40af]/30 dark:hover:border-[#58a6ff]/30 transition-all group pulse-on-hover shadow-sm"
          >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-[#e2e8f0] dark:group-hover:bg-[#30363d] transition-colors ${pdfConfirmedMissing ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-[#f1f5f9] dark:bg-[#21262d]'}`}>
                {pdfConfirmedMissing ? (
                  <FileX className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
                ) : (
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#64748b] dark:text-[#8b949e]" />
                )}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a] dark:text-[#e6edf3] truncate">
                  {hasKungorelse ? 'Visa kungörelse' : pdfConfirmedMissing ? 'Protokoll ej tillgängligt' : 'Visa protokoll'}
                </span>
                {pdfConfirmedMissing && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    PDF-filen saknas i arkivet
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {hasPdf && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0f172a] dark:text-[#e6edf3] bg-[#f1f5f9] dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#30363d] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Ladda ner
                </a>
              )}
              {!pdfConfirmedMissing && (
                (hasPdfUrl ? sourceExpanded : kungorelseExpanded) ? (
                  <ChevronUp className="w-5 h-5 text-[#64748b] dark:text-[#8b949e] transition-transform group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748b] dark:text-[#8b949e] transition-transform group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff]" />
                )
              )}
            </div>
          </button>

          {/* Mobile download button - shown below when expanded */}
          {hasPdf && sourceExpanded && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden flex items-center justify-center gap-2 mt-2 px-4 py-2.5 text-xs font-semibold text-[#0f172a] dark:text-[#e6edf3] bg-[#f1f5f9] dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-lg hover:bg-[#e2e8f0] dark:hover:bg-[#30363d] transition-colors w-full"
            >
              <Download className="w-4 h-4" />
              Ladda ner PDF
            </a>
          )}

          {/* PDF missing placeholder */}
          {pdfConfirmedMissing && sourceExpanded && (
            <div className="mt-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl overflow-hidden animate-slide-down">
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                  <FileX className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  PDF-filen är inte tillgänglig
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mb-4">
                  Protokollet analyserades från en lokal fil som inte har laddats upp till arkivet ännu.
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Nyhetsinnehållet är fortfarande tillgängligt ovan</span>
                </div>
              </div>
            </div>
          )}

          {/* PDF viewer - always mounted for background preloading, visibility toggled */}
          {hasPdf && (
            <div
              className={`mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                sourceExpanded
                  ? 'opacity-100 max-h-[500px] animate-slide-down'
                  : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
              }`}
              onClick={() => sourceExpanded && setFullscreenPdf(true)}
              aria-hidden={!sourceExpanded}
            >
              <PDFPreview
                url={item.sourceUrl!}
                compact={true}
                maxHeight={300}
                keywords={pdfKeywords}
              />
            </div>
          )}

          {/* Expanded content - Kungörelse text */}
          {hasKungorelse && kungorelseExpanded && (
            <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden animate-slide-down">
              <div className="p-6 max-h-[400px] overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-[1.8] whitespace-pre-wrap">
                  {item.kungorelse?.kungorelsetext || item.noticeText}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== FULLSCREEN PDF OVERLAY - mobile responsive ========== */}
      {fullscreenPdf && hasPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div
            ref={expandedContentRef}
            className="relative bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Protokoll</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Ladda ner</span>
                  <span className="sm:hidden">PDF</span>
                </a>
                <button
                  onClick={() => setFullscreenPdf(false)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            {/* PDF viewer - full height */}
            <div className="flex-1 overflow-hidden">
              <PDFPreview
                url={item.sourceUrl!}
                compact={false}
                keywords={pdfKeywords}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========== TWO-COLUMN MODULES (Faktaruta + Nyheter) - mobile responsive ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        {/* Left column - Faktaruta or Bolagsfakta */}
        <div className="flex flex-col">
          {hasKallelse && <KallelseFaktaruta data={item.kallelseFaktaruta} />}
          {hasNyemission && <NyemissionFaktaruta data={item.nyemissionFaktaruta} />}
          {hasKonkurs && <KonkursFaktaruta data={item.konkursFaktaruta} />}
          {hasStyrelse && <StyrelseFaktaruta data={item.styrelseFaktaruta} />}

          {/* Fallback to Bolagsfakta if no faktaruta */}
          {!hasFaktaruta && (
            <BolagsfaktaModule
              orgNumber={item.orgNumber}
              companyName={item.companyName}
              initialData={item.bolagsInfo ? {
                vd: item.bolagsInfo.vd,
                anstallda: item.bolagsInfo.anstallda,
                omsattning: item.bolagsInfo.omsattning,
                omsattningAr: item.bolagsInfo.omsattningAr,
                startat: item.bolagsInfo.startat,
              } : undefined}
            />
          )}
        </div>

        {/* Right column - News sidebar or Årsredovisningar */}
        <div className="flex flex-col gap-4">
          {showNewsSidebar ? (
            <NewsSidebar companyName={item.companyName} matchHeight />
          ) : (
            <ArsredovisningarModule
              orgNumber={item.orgNumber}
              companyName={item.companyName}
            />
          )}

          {/* ImpactLoop omnämnanden - visas endast i detaljvy och om träffar finns */}
          {showNewsSidebar && (
            <ImpactLoopModule
              companyName={item.companyName}
              orgNumber={item.orgNumber}
              maxItems={5}
            />
          )}
        </div>
      </div>
    </article>
  )
}
