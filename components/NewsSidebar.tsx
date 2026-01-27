'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Article {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

interface NewsSidebarProps {
  companyName: string
}

export default function NewsSidebar({ companyName }: NewsSidebarProps) {
  // Google News state
  const [newsArticles, setNewsArticles] = useState<Article[]>([])
  const [newsLoading, setNewsLoading] = useState(true)

  // Impact Loop state
  const [impactArticles, setImpactArticles] = useState<Article[]>([])
  const [impactLoading, setImpactLoading] = useState(true)
  const [impactExpanded, setImpactExpanded] = useState(false)

  // Animation state
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Fetch Google News
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true)
      try {
        const response = await fetch(`/api/news-search?q=${encodeURIComponent(companyName)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          setNewsArticles(data.articles || [])
        }
      } catch (e) {
        console.error('News search failed:', e)
      }
      setNewsLoading(false)
    }
    fetchNews()
  }, [companyName])

  // Fetch Impact Loop
  useEffect(() => {
    const fetchImpact = async () => {
      setImpactLoading(true)
      try {
        const response = await fetch(`/api/impactloop-search?q=${encodeURIComponent(companyName)}&limit=5`, {
          signal: AbortSignal.timeout(10000)
        })
        if (response.ok) {
          const data = await response.json()
          setImpactArticles(data.articles || [])
        }
      } catch (e) {
        console.error('Impact Loop search failed:', e)
      }
      setImpactLoading(false)
    }
    fetchImpact()
  }, [companyName])

  // Don't render anything if both are loading
  if (newsLoading && impactLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-400 dark:border-t-gray-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Don't render if no content at all
  if (!newsLoading && !impactLoading && newsArticles.length === 0 && impactArticles.length === 0) {
    return null
  }

  return (
    <div
      className={`
        space-y-4 transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
    >
      {/* News Coverage Module - Only show if articles exist */}
      {!newsLoading && newsArticles.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Nyhetsbevakning
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {newsArticles.length} artikel{newsArticles.length !== 1 ? 'ar' : ''} senaste dygnet
                </p>
              </div>
            </div>
          </div>

          {/* Articles */}
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {newsArticles.map((article, i) => (
              <li
                key={i}
                className={`
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100' : 'opacity-0'}
                `}
                style={{ transitionDelay: `${200 + i * 50}ms` }}
              >
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
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
        </section>
      )}

      {/* Impact Loop Module - Only show if articles exist */}
      {!impactLoading && impactArticles.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Expandable button */}
          <button
            onClick={() => setImpactExpanded(!impactExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/impactloop-logo.svg"
                alt="Impact Loop"
                width={18}
                height={18}
                className="opacity-70"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Impact Loop
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {impactArticles.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${impactExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expandable content */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${impactExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <ul className="divide-y divide-gray-50 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              {impactArticles.map((article, i) => (
                <li key={i}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                      {article.title}
                    </p>
                    {article.publishedDate && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {article.publishedDate}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            {/* Link to full search */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
              <a
                href={`https://www.impactloop.se/search?query=${encodeURIComponent(companyName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                Visa alla på impactloop.se
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
