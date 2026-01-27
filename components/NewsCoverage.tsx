'use client'

import { useState, useEffect } from 'react'

interface Article {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

interface NewsCoverageProps {
  companyName: string
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
        <div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Nyhetsbevakning
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {articles.length} artikel{articles.length !== 1 ? 'ar' : ''} om bolaget från det senaste dygnet
          </p>
        </div>
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
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
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
