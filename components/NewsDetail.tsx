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
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState(false)
  const [pdfExists, setPdfExists] = useState<boolean | null>(null)
  const [sourceExpanded, setSourceExpanded] = useState(false)
  const [fullscreenPdf, setFullscreenPdf] = useState(false)
  const [kungorelseExpanded, setKungorelseExpanded] = useState(false)

  const expandedContentRef = useRef<HTMLDivElement>(null)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Check if PDF exists
  useEffect(() => {
    if (item.sourceType === 'pdf' && item.sourceUrl) {
      fetch(item.sourceUrl, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            setPdfExists(true)
          } else {
            setPdfExists(false)
            setPdfError(true)
            setPdfLoading(false)
          }
        })
        .catch(() => {
          setPdfExists(false)
          setPdfError(true)
          setPdfLoading(false)
        })
    }
  }, [item.sourceUrl, item.sourceType])

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
  const hasPdf = item.sourceType === 'pdf' && !!item.sourceUrl && pdfExists !== false
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
    <article className="animate-fade-in">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
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
                  className="text-[10px] px-2 py-0.5 rounded font-mono font-medium uppercase tracking-wide"
                  style={{ backgroundColor: `${eventConfig.color}15`, color: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-black dark:text-white leading-tight">
              {item.companyName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {formatOrgNumber(item.orgNumber)}
              </span>
              <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(item.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Headline with Share button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          {item.headline && (
            <h2 className="text-2xl font-bold text-black dark:text-white leading-tight">
              {item.headline}
            </h2>
          )}
        </div>
        <ShareToChat
          companyName={item.companyName}
          headline={item.headline}
          newsId={item.id}
          className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-xs font-medium"
        />
      </div>

      {/* Notice text - prominent */}
      {item.noticeText && !hasKungorelse && (
        <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
          <p className="text-gray-700 dark:text-gray-300 leading-[1.8] text-base whitespace-pre-wrap">
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

      {/* ========== COLLAPSIBLE SOURCE BAR (Protokoll/Kungörelse) ========== */}
      {hasSource && (
        <div className="mb-6">
          {/* Collapsible header bar - full width, thin */}
          <button
            onClick={() => hasPdf ? setSourceExpanded(!sourceExpanded) : setKungorelseExpanded(!kungorelseExpanded)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {hasPdf ? 'Visa protokoll' : 'Visa kungörelse'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {hasPdf && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ladda ner
                </a>
              )}
              {(hasPdf ? sourceExpanded : kungorelseExpanded) ? (
                <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              )}
            </div>
          </button>

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
                onLoadSuccess={() => setPdfLoading(false)}
                onLoadError={() => {
                  setPdfLoading(false)
                  setPdfError(true)
                }}
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

      {/* ========== FULLSCREEN PDF OVERLAY ========== */}
      {fullscreenPdf && hasPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            ref={expandedContentRef}
            className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Protokoll</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ladda ner
                </a>
                <button
                  onClick={() => setFullscreenPdf(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

      {/* ========== TWO-COLUMN MODULES (Faktaruta + Nyheter) ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
