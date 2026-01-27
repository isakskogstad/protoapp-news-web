'use client'

import { useState, useEffect } from 'react'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatDate, getLogoUrl, detectEventType, formatOrgNumber } from '@/lib/utils'
import { FileText, ExternalLink, Clock, Building2, Download, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import BolagsInfoCard from './BolagsInfoCard'
import NyemissionFaktaruta from './NyemissionFaktaruta'
import KonkursFaktaruta from './KonkursFaktaruta'
import StyrelseFaktaruta from './StyrelseFaktaruta'
import KallelseFaktaruta from './KallelseFaktaruta'
import BolagsfaktaModule from './BolagsfaktaModule'
import ArsredovisningarModule from './ArsredovisningarModule'
import ShareToChat from './ShareToChat'
import NewsSidebar from './NewsSidebar'

interface NewsDetailProps {
  item: NewsItem
  showNewsSidebar?: boolean // Enable two-column layout with news sidebar
}

export default function NewsDetail({ item, showNewsSidebar = true }: NewsDetailProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState(false)
  const [pdfExists, setPdfExists] = useState<boolean | null>(null)
  const [pdfExpanded, setPdfExpanded] = useState(false)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Check if PDF exists before trying to display it
  useEffect(() => {
    if (item.sourceType === 'pdf' && item.sourceUrl) {
      // Use HEAD request to check if PDF exists
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

  // Determine what content is available
  const hasPdf = item.sourceType === 'pdf' && !!item.sourceUrl && pdfExists !== false
  const hasKungorelse = item.sourceType === 'kungorelse' && !!item.noticeText
  const hasBolagsInfo = !!item.bolagsInfo
  const hasKallelse = !!item.kallelseFaktaruta
  const hasNyemission = !!item.nyemissionFaktaruta
  const hasKonkurs = !!item.konkursFaktaruta
  const hasStyrelse = !!item.styrelseFaktaruta

  // Check if we have any specific left column content (faktarutor)
  const hasSpecificLeftContent = hasPdf || hasKungorelse || hasKallelse || hasNyemission || hasKonkurs || hasStyrelse

  // Always show two-column layout - use BolagsfaktaModule as fallback
  const hasLeftColumnContent = true // Always true - we show BolagsfaktaModule if nothing else

  return (
    <article className="animate-fade-in">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700">
            {/* Skeleton shimmer while loading */}
            {logoLoading && !logoError && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 skeleton-shimmer rounded-xl" />
            )}
            {!logoError ? (
              <img
                src={logoUrl}
                alt=""
                className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${logoLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setLogoLoading(false)}
                onError={() => {
                  setLogoError(true)
                  setLogoLoading(false)
                }}
              />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 font-bold text-sm">
                {item.companyName.substring(0, 2).toUpperCase()}
              </span>
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

      {/* Headline */}
      {item.headline && (
        <h2 className="text-lg font-bold text-black dark:text-white mb-3 leading-snug">
          {item.headline}
        </h2>
      )}

      {/* Notice text */}
      {item.noticeText && (
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 leading-[1.75] text-sm whitespace-pre-wrap">
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

      {/* Two-column layout for modules - always show when sidebar is enabled */}
      {showNewsSidebar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
          {/* Left column: Protocol/Kungörelse + Faktarutor */}
          <div className="space-y-4 flex flex-col min-h-[200px]">
            {/* Inline PDF Viewer - Only if PDF exists and is accessible */}
            {hasPdf && pdfExists && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                {/* PDF Header */}
                <button
                  onClick={() => !pdfError && setPdfExpanded(!pdfExpanded)}
                  className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-black dark:text-white">Protokoll</h3>
                      <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{item.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Ladda ner
                    </a>
                    {pdfExpanded ? (
                      <Minimize2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </button>

                {/* PDF Content - 200px collapsed, 600px expanded */}
                <div
                  className="relative bg-gray-100 dark:bg-gray-800 transition-all duration-300 ease-in-out cursor-pointer"
                  style={{ height: pdfExpanded ? '600px' : '200px' }}
                  onClick={() => !pdfExpanded && setPdfExpanded(true)}
                >
                  {/* Loading state */}
                  {pdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Laddar...</p>
                      </div>
                    </div>
                  )}

                  {/* PDF iframe */}
                  <iframe
                    src={`${item.sourceUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className={`w-full h-full border-0 transition-opacity ${pdfLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setPdfLoading(false)}
                    onError={() => {
                      setPdfLoading(false)
                      setPdfError(true)
                    }}
                    title="PDF-dokument"
                  />

                  {/* Expand overlay when collapsed */}
                  {!pdfExpanded && !pdfLoading && (
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-gray-900/90 via-transparent to-transparent flex items-end justify-center pb-3 pointer-events-none">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                        Klicka för att visa hela dokumentet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inline Kungörelse text (if source type is kungorelse) */}
            {hasKungorelse && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-black dark:text-white">Kungörelse</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-[1.75] whitespace-pre-wrap">
                    {item.noticeText}
                  </p>
                </div>
              </div>
            )}

            {/* Faktarutor - only render if data exists */}
            {hasKallelse && <KallelseFaktaruta data={item.kallelseFaktaruta} />}
            {hasNyemission && <NyemissionFaktaruta data={item.nyemissionFaktaruta} />}
            {hasKonkurs && <KonkursFaktaruta data={item.konkursFaktaruta} />}
            {hasStyrelse && <StyrelseFaktaruta data={item.styrelseFaktaruta} />}

            {/* Bolagsfakta - always show as fallback when no other faktaruta */}
            {!hasSpecificLeftContent && (
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

            {/* Årsredovisningar - show when no other faktaruta (to ensure at least 2 modules) */}
            {!hasSpecificLeftContent && (
              <ArsredovisningarModule
                orgNumber={item.orgNumber}
                companyName={item.companyName}
              />
            )}
          </div>

          {/* Right column: News Sidebar (related news) - matches left column height */}
          {showNewsSidebar && (
            <div className="flex flex-col min-h-[200px]">
              <NewsSidebar companyName={item.companyName} matchHeight />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <section className="pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
        <ShareToChat
          companyName={item.companyName}
          headline={item.headline}
          newsId={item.id}
        />
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <a
          href={`https://www.allabolag.se/${item.orgNumber.replace(/-/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <span>Visa på Allabolag</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </section>
    </article>
  )
}
