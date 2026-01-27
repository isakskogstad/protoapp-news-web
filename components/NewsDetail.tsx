'use client'

import Image from 'next/image'
import { NewsItem, eventTypeConfig } from '@/lib/types'
import { formatDate, formatSignalName, getLogoUrl, detectEventType } from '@/lib/utils'
import ImpactLoopSection from './ImpactLoopSection'

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
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
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
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-medium">
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
                  item.newsValue >= 7 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {item.newsValue}/10
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              {item.companyName}
            </h1>
            <p className="text-sm text-gray-500 font-mono">
              {item.orgNumber} · {formatDate(item.timestamp)}
            </p>
          </div>
        </div>
      </header>

      {/* Headline */}
      {item.headline && (
        <h2 className="text-lg font-medium text-gray-800 mb-4 leading-relaxed">
          {item.headline}
        </h2>
      )}

      {/* Notice text */}
      {item.noticeText && (
        <div className="mb-8">
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {item.noticeText}
          </p>
        </div>
      )}

      {/* Signals */}
      {item.signals?.detekterade && item.signals.detekterade.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Signaler
          </h3>
          <div className="space-y-2">
            {item.signals.detekterade.map((signal, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  signal.styrka === 'stark' ? 'bg-red-100 text-red-700' :
                  signal.styrka === 'medel' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {signal.styrka || '—'}
                </span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {formatSignalName(signal.signal)}
                  </p>
                  {signal.motivering && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {signal.motivering}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calculations */}
      {item.calculations && Object.keys(item.calculations).length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Beräkningar
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {item.calculations.utspädning_procent !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Utspädning</p>
                <p className="text-lg font-semibold text-gray-900">
                  {item.calculations.utspädning_procent.toFixed(1)}%
                </p>
              </div>
            )}
            {item.calculations.värdering_pre !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Pre-money</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(item.calculations.värdering_pre / 1e6).toFixed(1)}M
                </p>
              </div>
            )}
            {item.calculations.värdering_post !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Post-money</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(item.calculations.värdering_post / 1e6).toFixed(1)}M
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Impact Loop */}
      <section className="mb-8">
        <ImpactLoopSection companyName={item.companyName} />
      </section>

      {/* Links */}
      <section>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.allabolag.se/${item.orgNumber.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Allabolag ↗
          </a>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(item.companyName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Google ↗
          </a>
          <a
            href={`https://news.google.com/search?q=${encodeURIComponent(item.companyName)}&hl=sv&gl=SE`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Nyheter ↗
          </a>
        </div>
      </section>
    </article>
  )
}
