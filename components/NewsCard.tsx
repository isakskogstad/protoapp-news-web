'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatRelativeTime, getLogoUrl, detectEventType } from '@/lib/utils'
import ShareButton from './ShareButton'

interface NewsCardProps {
  item: NewsItem
}

// Format date as "12 juni -24"
function formatEventDate(dateStr?: string): string | null {
  if (!dateStr) return null

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null

    const day = date.getDate()
    const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear().toString().slice(-2)

    return `${day} ${month} -${year}`
  } catch {
    return null
  }
}

// Get protocol type label for the two-line format
function getProtocolLabel(protocolType?: string): { line1: string; suffix: string } | null {
  if (!protocolType) return null

  const type = protocolType.toLowerCase()

  if (type.includes('årsstämma') || type.includes('arsstamma')) {
    return { line1: 'Protokoll från', suffix: 'årsstämman' }
  }
  if (type.includes('extra')) {
    return { line1: 'Protokoll från', suffix: 'extra stämman' }
  }
  if (type.includes('konstituerande') && type.includes('styrelse')) {
    return { line1: 'Protokoll från', suffix: 'konst. styrelsemötet' }
  }
  if (type.includes('styrelse')) {
    return { line1: 'Protokoll från', suffix: 'styrelsemötet' }
  }
  if (type.includes('per capsulam')) {
    return { line1: 'Per capsulam-beslut', suffix: '' }
  }

  return null
}

export default function NewsCard({ item }: NewsCardProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Get formatted event date and protocol label
  const formattedDate = formatEventDate(item.eventDate)
  const protocolLabel = getProtocolLabel(item.protocolType)
  const showTwoLineLabel = protocolLabel && formattedDate

  // Render the protocol badge (two-line format with date, or simple label)
  const renderProtocolBadge = (compact = false) => {
    if (showTwoLineLabel) {
      return (
        <div
          className={`flex flex-col ${compact ? 'px-2 py-1' : 'px-2.5 py-1'} rounded-lg text-white leading-tight`}
          style={{ backgroundColor: eventConfig?.color || '#6366f1' }}
        >
          <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-medium opacity-90`}>
            {protocolLabel.line1} {protocolLabel.suffix}
          </span>
          <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-semibold`}>
            den {formattedDate}
          </span>
        </div>
      )
    }

    // Fallback to simple badge
    if (eventConfig) {
      return (
        <span
          className={`${compact ? 'text-[9px]' : 'text-[10px]'} px-2 py-0.5 rounded-full font-medium text-white whitespace-nowrap`}
          style={{ backgroundColor: eventConfig.color }}
        >
          {eventConfig.label}
        </span>
      )
    }

    // Protocol type badge without event type
    if (item.protocolType) {
      return (
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} px-2 py-0.5 rounded-full font-medium text-white whitespace-nowrap bg-indigo-500`}>
          {item.protocolType}
        </span>
      )
    }

    return null
  }

  return (
    <article className="relative group bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100/80 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer">
      <Link href={`/news/${item.id}`} className="block p-4 md:p-6">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-5">
          {/* Company info row (mobile) / column (desktop) */}
          <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-0 md:w-20 flex-shrink-0">
            {/* Logo - shown directly with rounded corners */}
            <div className="relative w-12 h-12 md:w-14 md:h-14 md:mb-2 flex items-center justify-center flex-shrink-0">
              {/* Skeleton shimmer while loading */}
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

            {/* Company name and org number - inline on mobile, stacked on desktop */}
            <div className="flex flex-col md:items-center min-w-0 flex-1 md:flex-initial">
              <p className="text-xs md:text-[11px] font-medium text-gray-700 dark:text-gray-300 md:text-gray-500 md:dark:text-gray-400 md:text-center leading-tight line-clamp-1 md:line-clamp-2">
                {item.companyName}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                {item.orgNumber}
              </p>
            </div>

            {/* Badge on mobile - shown inline with company info */}
            <div className="flex items-center gap-2 md:hidden ml-auto">
              {renderProtocolBadge(true)}
            </div>
          </div>

          {/* Main content: Headline + Notice */}
          <div className="flex-1 min-w-0">
            {/* Top row: Badge + Time - hidden on mobile (badge shown above) */}
            <div className="hidden md:flex items-center gap-2 mb-2">
              {renderProtocolBadge(false)}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>

            {/* Time on mobile - shown separately */}
            <span className="md:hidden text-xs text-gray-400 dark:text-gray-500 mb-1.5 block">
              {formatRelativeTime(item.timestamp)}
            </span>

            {/* Headline - Bold and prominent */}
            {item.headline && (
              <h3 className="text-base md:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.headline}
              </h3>
            )}

            {/* Notice text - Full focus, more lines on mobile for readability */}
            {item.noticeText && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4 md:line-clamp-3">
                {item.noticeText}
              </p>
            )}

            {/* Fallback if no headline/notice */}
            {!item.headline && !item.noticeText && (
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Ny händelse för {item.companyName}
              </h3>
            )}
          </div>
        </div>
      </Link>

      {/* Share button - always visible on mobile, hover on desktop */}
      <div className="absolute top-3 right-3 md:top-5 md:right-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <ShareButton item={item} />
      </div>
    </article>
  )
}
