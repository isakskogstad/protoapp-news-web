'use client'

import { useState, useEffect, useRef } from 'react'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatDate, getLogoUrl, detectEventType, formatOrgNumber } from '@/lib/utils'
import { FileText, Clock, Building2, Download, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react'
import BolagsInfoCard from './BolagsInfoCard'
import NyemissionFaktaruta from './NyemissionFaktaruta'
import KonkursFaktaruta from './KonkursFaktaruta'
import StyrelseFaktaruta from './StyrelseFaktaruta'
import KallelseFaktaruta from './KallelseFaktaruta'
import BolagsfaktaModule from './BolagsfaktaModule'
import ArsredovisningarModule from './ArsredovisningarModule'
import ShareToChat from './ShareToChat'
import NewsSidebar from './NewsSidebar'
import PDFPreview from './PDFPreview'

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

  // Determine content availability
  const hasPdf = item.sourceType === 'pdf' && !!item.sourceUrl
  const hasKungorelse = item.sourceType === 'kungorelse'
  const hasBolagsInfo = !!item.bolagsInfo
  const hasKallelse = !!item.kallelseFaktaruta
  const hasNyemission = !!item.nyemissionFaktaruta
  const hasKonkurs = !!item.konkursFaktaruta
  const hasStyrelse = !!item.styrelseFaktaruta

  // Get the primary faktaruta (first one that exists)
  const hasFaktaruta = hasKallelse || hasNyemission || hasKonkurs || hasStyrelse
  const hasSource = hasPdf || hasKungorelse

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
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#e6edf3] leading-tight truncate">
              {item.companyName}
            </h1>
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
            onClick={() => hasPdf ? setSourceExpanded(!sourceExpanded) : setKungorelseExpanded(!kungorelseExpanded)}
            className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between hover:bg-[#f8fafc] dark:hover:bg-[#21262d] hover:border-[#1e40af]/30 dark:hover:border-[#58a6ff]/30 transition-all group pulse-on-hover shadow-sm"
          >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg sm:rounded-xl bg-[#f1f5f9] dark:bg-[#21262d] flex items-center justify-center group-hover:bg-[#e2e8f0] dark:group-hover:bg-[#30363d] transition-colors">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#64748b] dark:text-[#8b949e]" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-[#0f172a] dark:text-[#e6edf3] truncate">
                {hasPdf ? 'Visa protokoll' : 'Visa kungörelse'}
              </span>
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
              {(hasPdf ? sourceExpanded : kungorelseExpanded) ? (
                <ChevronUp className="w-5 h-5 text-[#64748b] dark:text-[#8b949e] transition-transform group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#64748b] dark:text-[#8b949e] transition-transform group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff]" />
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

          {/* Expanded content - PDF viewer */}
          {hasPdf && sourceExpanded && (
            <div
              className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden animate-slide-down cursor-pointer"
              onClick={() => setFullscreenPdf(true)}
            >
              <PDFPreview
                url={item.sourceUrl!}
                compact={true}
                maxHeight={300}
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
        <div className="flex flex-col">
          {showNewsSidebar ? (
            <NewsSidebar companyName={item.companyName} matchHeight />
          ) : (
            <ArsredovisningarModule
              orgNumber={item.orgNumber}
              companyName={item.companyName}
            />
          )}
        </div>
      </div>
    </article>
  )
}
