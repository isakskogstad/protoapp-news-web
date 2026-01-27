'use client'

import Image from 'next/image'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatDate, getLogoUrl, detectEventType } from '@/lib/utils'
import NewsCoverage from './NewsCoverage'

interface NewsDetailProps {
  item: NewsItem
}

export default function NewsDetail({ item }: NewsDetailProps) {
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  return (
    <article className="animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-contain p-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600 font-medium">
              {item.companyName.substring(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {eventConfig && (
                <span
                  className="text-xs px-2 py-0.5 rounded text-white font-medium"
                  style={{ backgroundColor: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              )}
              {item.newsValue && item.newsValue >= 5 && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  item.newsValue >= 7 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                }`}>
                  {item.newsValue}/10
                </span>
              )}
            </div>
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
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {item.noticeText}
          </p>
        </div>
      )}

      {/* News Coverage */}
      <NewsCoverage companyName={item.companyName} />

      {/* Calculations */}
      {item.calculations && Object.keys(item.calculations).length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Beräkningar
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {item.calculations.utspädning_procent !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Utspädning</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {item.calculations.utspädning_procent.toFixed(1)}%
                </p>
              </div>
            )}
            {item.calculations.värdering_pre !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pre-money</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {(item.calculations.värdering_pre / 1e6).toFixed(1)}M
                </p>
              </div>
            )}
            {item.calculations.värdering_post !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Post-money</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {(item.calculations.värdering_post / 1e6).toFixed(1)}M
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Allabolag link */}
      <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
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
    </article>
  )
}
