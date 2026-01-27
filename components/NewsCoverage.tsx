'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Article {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

interface NewsCoverageProps {
  companyName: string
}

// Swedish media source logos (favicon URLs)
const mediaLogos: Record<string, string> = {
  'Svenska Dagbladet': 'https://www.svd.se/favicon.ico',
  'SvD': 'https://www.svd.se/favicon.ico',
  'Dagens Nyheter': 'https://www.dn.se/favicon.ico',
  'DN': 'https://www.dn.se/favicon.ico',
  'Expressen': 'https://www.expressen.se/favicon.ico',
  'Aftonbladet': 'https://www.aftonbladet.se/favicon.ico',
  'Dagens Industri': 'https://www.di.se/favicon.ico',
  'DI': 'https://www.di.se/favicon.ico',
  'SVT Nyheter': 'https://www.svt.se/favicon.ico',
  'SVT': 'https://www.svt.se/favicon.ico',
  'TV4 Nyheterna': 'https://www.tv4.se/favicon.ico',
  'TV4': 'https://www.tv4.se/favicon.ico',
  'Göteborgs-Posten': 'https://www.gp.se/favicon.ico',
  'GP': 'https://www.gp.se/favicon.ico',
  'Sydsvenskan': 'https://www.sydsvenskan.se/favicon.ico',
  'Breakit': 'https://www.breakit.se/favicon.ico',
  'Realtid': 'https://www.realtid.se/favicon.ico',
  'Placera': 'https://www.placera.se/favicon.ico',
  'Avanza': 'https://www.avanza.se/favicon.ico',
  'Nordnet': 'https://www.nordnet.se/favicon.ico',
  'Omni': 'https://omni.se/favicon.ico',
  'Omni Ekonomi': 'https://omni.se/favicon.ico',
  'E24': 'https://e24.no/favicon.ico',
  'TT': 'https://tt.se/favicon.ico',
  'TT Nyhetsbyrån': 'https://tt.se/favicon.ico',
  'Reuters': 'https://www.reuters.com/favicon.ico',
  'Bloomberg': 'https://www.bloomberg.com/favicon.ico',
  'Financial Times': 'https://www.ft.com/favicon.ico',
  'FT': 'https://www.ft.com/favicon.ico',
  'Nasdaq': 'https://www.nasdaq.com/favicon.ico',
  'Yahoo Finance': 'https://finance.yahoo.com/favicon.ico',
  'Google News': 'https://news.google.com/favicon.ico',
}

function getMediaLogo(source?: string): string | null {
  if (!source) return null
  // Try exact match first
  if (mediaLogos[source]) return mediaLogos[source]
  // Try partial match
  for (const [key, url] of Object.entries(mediaLogos)) {
    if (source.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(source.toLowerCase())) {
      return url
    }
  }
  return null
}

export default function NewsCoverage({ companyName }: NewsCoverageProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    fetchArticles()
  }, [companyName])

  useEffect(() => {
    if (!isLoading && articles.length > 0) {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading, articles.length])

  const fetchArticles = async () => {
    setIsLoading(true)

    try {
      // Fetch from Google News via our news-search API
      const response = await fetch(`/api/news-search?q=${encodeURIComponent(companyName)}&limit=5`)

      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
      } else {
        setArticles([])
      }
    } catch (e) {
      console.error('News search failed:', e)
      setArticles([])
    }

    setIsLoading(false)
  }

  // Don't render anything if no articles found
  if (!isLoading && articles.length === 0) {
    return null
  }

  // Don't render while loading
  if (isLoading) {
    return null
  }

  return (
    <section
      className={`
        mb-8 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Nyheter om {companyName}
        </h3>
      </div>

      {/* Articles list */}
      <ul className="space-y-2">
        {articles.map((article, i) => (
          <li
            key={i}
            className={`
              transition-all duration-300 ease-out
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
            `}
            style={{ transitionDelay: `${200 + i * 75}ms` }}
          >
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-800/30 transition-colors group"
            >
              {/* Media logo or fallback dot */}
              {getMediaLogo(article.source) ? (
                <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 mt-0.5 bg-white">
                  <img
                    src={getMediaLogo(article.source)!}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.parentElement!.innerHTML = '<div class="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 m-auto"></div>'
                    }}
                  />
                </div>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {article.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {article.source && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {article.source}
                    </span>
                  )}
                  {article.publishedDate && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {article.publishedDate}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
