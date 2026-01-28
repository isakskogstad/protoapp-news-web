'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatRelativeTime, getLogoUrl, detectEventType } from '@/lib/utils'
import ShareButton from './ShareButton'

interface NewsCardProps {
  item: NewsItem
}

export default function NewsCard({ item }: NewsCardProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  return (
    <article className="relative group bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100/80 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer">
      <Link href={`/news/${item.id}`} className="block p-5">
        <div className="flex gap-5">
          {/* Left column: Logo + Company info */}
          <div className="flex flex-col items-center w-20 flex-shrink-0">
            {/* Logo - shown directly with rounded corners */}
            <div className="relative w-14 h-14 mb-2 flex items-center justify-center">
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

            {/* Company name */}
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight line-clamp-2">
              {item.companyName}
            </p>

            {/* Org number */}
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
              {item.orgNumber}
            </p>
          </div>

          {/* Main content: Headline + Notice */}
          <div className="flex-1 min-w-0">
            {/* Top row: Badge + Time */}
            <div className="flex items-center gap-2 mb-2">
              {eventConfig && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                  style={{ backgroundColor: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>

            {/* Headline - Bold and prominent */}
            {item.headline && (
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.headline}
              </h3>
            )}

            {/* Notice text - Full focus */}
            {item.noticeText && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
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

      {/* Share button */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ShareButton item={item} />
      </div>
    </article>
  )
}
