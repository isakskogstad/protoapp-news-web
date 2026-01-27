'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Article {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

interface ImpactLoopSidebarProps {
  companyName: string
}

export default function ImpactLoopSidebar({ companyName }: ImpactLoopSidebarProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [companyName])

  const fetchArticles = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First try Impact Loop proxy
      const ilResponse = await fetch(`/api/impactloop?q=${encodeURIComponent(companyName)}&limit=5`, {
        signal: AbortSignal.timeout(5000)
      })

      if (ilResponse.ok) {
        const data = await ilResponse.json()
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles)
          setIsLoading(false)
          return
        }
      }
    } catch (e) {
      console.log('Impact Loop failed, trying fallback:', e)
    }

    // Fallback: Use our news search API
    try {
      const fallbackResponse = await fetch(`/api/news-search?q=${encodeURIComponent(companyName)}&limit=5`)

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json()
        setArticles(data.articles || [])
      } else {
        setArticles([])
      }
    } catch (e) {
      console.error('Fallback search failed:', e)
      setError('Kunde inte hämta nyheter')
      setArticles([])
    }

    setIsLoading(false)
  }

  return (
    <aside
      className={`
        bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
    >
      {/* Header with logo */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="/impactloop-logo.svg"
            alt="Impact Loop"
            width={20}
            height={20}
            className="opacity-80"
          />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Impact Loop
          </span>
        </div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
          Nyheter om {companyName}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-400 dark:border-t-gray-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Söker artiklar...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">{error}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Inga artiklar hittades
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {articles.map((article, i) => (
              <li
                key={i}
                className={`
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                `}
                style={{ transitionDelay: `${150 + i * 75}ms` }}
              >
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 -mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {article.source && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {article.source}
                      </span>
                    )}
                    {article.publishedDate && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {article.publishedDate}
                      </span>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* Article count */}
        {!isLoading && !error && articles.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {articles.length} artikel{articles.length !== 1 ? 'ar' : ''} hittade
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
