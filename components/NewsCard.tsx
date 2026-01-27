'use client'

import Image from 'next/image'
import Link from 'next/link'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatRelativeTime, getLogoUrl, detectEventType } from '@/lib/utils'
import ShareButton from './ShareButton'

interface NewsCardProps {
  item: NewsItem
}

export default function NewsCard({ item }: NewsCardProps) {
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  return (
    <article className="relative group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 hover-lift cursor-pointer transition-colors">
      <Link href={`/news/${item.id}`} className="block">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-contain p-1.5"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600 font-medium text-sm">
              {item.companyName.substring(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-2 mb-1.5">
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

            {/* Company name */}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {item.companyName}
            </h3>

            {/* Headline */}
            {item.headline && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                {item.headline}
              </p>
            )}

            {/* Notice text */}
            {item.noticeText && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {item.noticeText}
              </p>
            )}

            {/* Bottom row */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                {item.orgNumber}
              </span>
            </div>
          </div>

          {/* Right side: News value */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {item.newsValue && item.newsValue >= 4 && (
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                ${item.newsValue >= 7 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                  item.newsValue >= 5 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
              `}>
                {item.newsValue}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Share button (outside link) */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ShareButton item={item} />
      </div>
    </article>
  )
}
