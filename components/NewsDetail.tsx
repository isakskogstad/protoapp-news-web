'use client'

import { useState } from 'react'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatDate, getLogoUrl, detectEventType } from '@/lib/utils'
import BolagsInfoCard from './BolagsInfoCard'
import NyemissionFaktaruta from './NyemissionFaktaruta'
import KonkursFaktaruta from './KonkursFaktaruta'
import StyrelseFaktaruta from './StyrelseFaktaruta'
import KallelseFaktaruta from './KallelseFaktaruta'
import SourceViewerModal from './SourceViewerModal'

interface NewsDetailProps {
  item: NewsItem
}

export default function NewsDetail({ item }: NewsDetailProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Determine if we have a viewable source
  const hasSource = item.sourceType === 'pdf' ? !!item.sourceUrl : item.sourceType === 'kungorelse'

  // Get button text based on source type
  const getSourceButtonText = () => {
    if (item.sourceType === 'pdf') return 'Se protokoll'
    if (item.sourceType === 'kungorelse') return 'Se kungörelse'
    return 'Se källa'
  }

  return (
    <article className="animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex items-center justify-center">
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
              <span className="text-gray-300 dark:text-gray-600 font-medium">
                {item.companyName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1">
            {eventConfig && (
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded text-white font-medium"
                  style={{ backgroundColor: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              </div>
            )}
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {item.companyName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {item.orgNumber} · {formatDate(item.timestamp)}
            </p>
          </div>
        </div>
      </header>

      {/* Headline */}
      {item.headline && (
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
          {item.headline}
        </h2>
      )}

      {/* Notice text */}
      {item.noticeText && (
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {item.noticeText}
          </p>
        </div>
      )}

      {/* Source button */}
      {hasSource && (
        <div className="mb-8">
          <button
            onClick={() => setShowSourceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {item.sourceType === 'pdf' ? (
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {getSourceButtonText()}
          </button>
        </div>
      )}

      {/* Faktarutor - visas baserat på typ av händelse */}
      <div className="space-y-4 mb-8">
        {/* Bolagsinformation */}
        <BolagsInfoCard data={item.bolagsInfo} />

        {/* Kallelse till stämma */}
        <KallelseFaktaruta data={item.kallelseFaktaruta} />

        {/* Nyemission */}
        <NyemissionFaktaruta data={item.nyemissionFaktaruta} />

        {/* Konkurs */}
        <KonkursFaktaruta data={item.konkursFaktaruta} />

        {/* Styrelseförändringar */}
        <StyrelseFaktaruta data={item.styrelseFaktaruta} />
      </div>

      {/* Actions */}
      <section className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">
        <a
          href={`https://www.allabolag.se/${item.orgNumber.replace(/-/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <span>Visa på Allabolag</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </section>

      {/* Source Viewer Modal */}
      <SourceViewerModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        sourceUrl={item.sourceUrl}
        sourceType={item.sourceType}
        kungorelseText={item.noticeText}
        companyName={item.companyName}
      />
    </article>
  )
}
