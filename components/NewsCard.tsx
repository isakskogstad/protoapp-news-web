'use client'

import Image from 'next/image'
import Link from 'next/link'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatRelativeTime, getLogoUrl, detectEventType } from '@/lib/utils'

interface NewsCardProps {
  item: NewsItem
}

export default function NewsCard({ item }: NewsCardProps) {
  const eventType = detectEventType(item)
  const eventConfig = eventType ? eventTypeConfig[eventType] : null
  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  return (
    <Link href={`/news/${item.id}`} className="block">
      <article className="group bg-white rounded-lg border border-gray-100 p-5 hover-lift cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-contain p-1"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-medium text-xs">
              {item.companyName.substring(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-2 mb-1">
              {eventConfig && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
                  style={{ backgroundColor: eventConfig.color }}
                >
                  {eventConfig.label}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>

            {/* Company name */}
            <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors">
              {item.companyName}
            </h3>

            {/* Headline */}
            {item.headline && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {item.headline}
              </p>
            )}

            {/* Org number */}
            <p className="text-[11px] text-gray-400 mt-2 font-mono">
              {item.orgNumber}
            </p>
          </div>

          {/* News value */}
          {item.newsValue && item.newsValue >= 5 && (
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${item.newsValue >= 7 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}
            `}>
              {item.newsValue}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
