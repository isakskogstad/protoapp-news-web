'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatRelativeTime, getLogoUrl, detectEventType } from '@/lib/utils'
import ShareButton from './ShareButton'

interface NewsCardProps {
  item: NewsItem
  compact?: boolean
  index?: number // For stagger animation
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

export default function NewsCard({ item, compact = false, index = 0 }: NewsCardProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Get formatted event date and protocol label
  const formattedDate = formatEventDate(item.eventDate)
  const protocolLabel = getProtocolLabel(item.protocolType)
  const showTwoLineLabel = protocolLabel && formattedDate && !compact

  // Stagger animation delay
  const animationDelay = `${Math.min(index * 50, 300)}ms`

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

  // Compact view - single line with essential info
  if (compact) {
    return (
      <article
        className="relative group rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] animate-reveal"
        style={{ animationDelay }}
      >
        <Link href={`/news/${item.id}`} className="flex items-center gap-3 p-4">
          {/* Small logo */}
          <div className="relative w-9 h-9 flex-shrink-0">
            {!logoError ? (
              <img
                src={logoUrl}
                alt=""
                className={`w-full h-full object-contain rounded-lg transition-opacity duration-300 ${logoLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setLogoLoading(false)}
                onError={() => {
                  setLogoError(true)
                  setLogoLoading(false)
                }}
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                <span className="text-stone-500 dark:text-stone-400 font-semibold text-[10px]">
                  {item.companyName.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500 dark:text-stone-400 truncate">
                {item.companyName}
              </span>
              {eventConfig && (
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium text-white whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              )}
            </div>
            <p className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {item.headline || item.noticeText || `Ny händelse för ${item.companyName}`}
            </p>
            <span className="text-xs text-stone-400 dark:text-stone-500 mt-1 block">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>

          {/* Chevron */}
          <svg className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </article>
    )
  }

  // Full view - cleaner design with micro-interactions
  return (
    <article
      className="relative group p-5 md:p-6 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 border-b border-stone-100 dark:border-stone-800/50 hover:border-transparent transition-all duration-150 ease-out cursor-pointer hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] animate-reveal"
      style={{ animationDelay }}
    >
      <Link href={`/news/${item.id}`} className="block">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-5">
          {/* Company info row (mobile) / column (desktop) */}
          <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-0 md:w-20 flex-shrink-0">
            {/* Logo - shown directly with rounded corners */}
            <div className="relative w-12 h-12 md:w-14 md:h-14 md:mb-2 flex items-center justify-center flex-shrink-0">
              {/* Skeleton shimmer while loading */}
              {logoLoading && !logoError && (
                <div className="absolute inset-0 bg-stone-100 dark:bg-stone-800 skeleton-shimmer rounded-xl" />
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
                <div className="w-full h-full rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <span className="text-stone-500 dark:text-stone-400 font-semibold text-sm">
                    {item.companyName.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Company name and org number - inline on mobile, stacked on desktop */}
            <div className="flex flex-col md:items-center min-w-0 flex-1 md:flex-initial">
              <p className="text-sm md:text-[11px] text-stone-500 dark:text-stone-400 md:text-center leading-tight line-clamp-1 md:line-clamp-2">
                {item.companyName}
              </p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono mt-0.5">
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
            {/* Top row: Event type badge */}
            <div className="hidden md:flex items-center gap-3 mb-2">
              {eventConfig && (
                <span
                  className="text-[10px] uppercase tracking-widest font-medium"
                  style={{ color: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              )}
            </div>

            {/* Company name on desktop - cleaner typography hierarchy */}
            <p className="hidden md:block text-sm text-stone-500 dark:text-stone-400 mb-1">
              {item.companyName}
            </p>

            {/* Headline - Bold and prominent */}
            {item.headline && (
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.headline}
              </h3>
            )}

            {/* Notice text - Full focus, more lines on mobile for readability */}
            {item.noticeText && (
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-4 md:line-clamp-3">
                {item.noticeText}
              </p>
            )}

            {/* Fallback if no headline/notice */}
            {!item.headline && !item.noticeText && (
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Ny händelse för {item.companyName}
              </h3>
            )}

            {/* Date and protocol type - subtle footer */}
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">
              {formatRelativeTime(item.timestamp)}
              {item.protocolType && ` \u2022 ${item.protocolType}`}
            </p>
          </div>
        </div>
      </Link>

      {/* Share button - always visible on mobile, hover on desktop */}
      <div className="absolute top-4 right-4 md:top-5 md:right-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
        <ShareButton item={item} />
      </div>
    </article>
  )
}
