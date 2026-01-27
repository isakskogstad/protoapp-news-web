'use client'

import { useState, useEffect } from 'react'

interface Article {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

interface ImpactLoopSectionProps {
  companyName: string
}

export default function ImpactLoopSection({ companyName }: ImpactLoopSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isExpanded && !hasSearched) {
      setIsLoading(true)
      setError(null)

      // Try Impact Loop first, fallback to scraping Google News
      fetchArticles()
    }
  }, [isExpanded, hasSearched, companyName])

  const fetchArticles = async () => {
    try {
      // First try Impact Loop proxy
      const ilResponse = await fetch(`/api/impactloop?q=${encodeURIComponent(companyName)}&limit=5`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (ilResponse.ok) {
        const data = await ilResponse.json()
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles)
          setHasSearched(true)
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

    setHasSearched(true)
    setIsLoading(false)
  }

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Nyheter om {companyName}
        </span>
        <div className="flex items-center gap-2">
          {hasSearched && !error && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {articles.length} artikel{articles.length !== 1 ? 'ar' : ''}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-400 dark:border-t-gray-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="py-4">
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-2">{error}</p>
              <a
                href={`https://news.google.com/search?q=${encodeURIComponent(companyName)}&hl=sv&gl=SE`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sök på Google News →
              </a>
            </div>
          ) : articles.length === 0 ? (
            <div className="py-4">
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-2">
                Inga artiklar hittades
              </p>
              <a
                href={`https://news.google.com/search?q=${encodeURIComponent(companyName)}&hl=sv&gl=SE`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sök på Google News →
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800 mt-2">
              {articles.map((article, i) => (
                <li key={i} className="py-3">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
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

          {/* Google News link at bottom */}
          {articles.length > 0 && (
            <a
              href={`https://news.google.com/search?q=${encodeURIComponent(companyName)}&hl=sv&gl=SE`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              Visa fler på Google News →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
