'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Article {
  title: string
  url: string
  excerpt?: string
  publishedDate?: string
}

interface ImpactLoopSidebarProps {
  companyName: string
}

export default function ImpactLoopSidebar({ companyName }: ImpactLoopSidebarProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [searchUrl, setSearchUrl] = useState<string>('')

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

    try {
      const response = await fetch(`/api/impactloop-search?q=${encodeURIComponent(companyName)}&limit=5`, {
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
        setSearchUrl(data.searchUrl || `https://www.impactloop.se/search?query=${encodeURIComponent(companyName)}`)
      } else {
        setArticles([])
        setSearchUrl(`https://www.impactloop.se/search?query=${encodeURIComponent(companyName)}`)
      }
    } catch (e) {
      console.error('Impact Loop search failed:', e)
      setArticles([])
      setSearchUrl(`https://www.impactloop.se/search?query=${encodeURIComponent(companyName)}`)
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
          Artiklar om {companyName}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-400 dark:border-t-gray-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Söker på impactloop.se...</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
              Inga artiklar hittades
            </p>
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sök på Impact Loop
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : (
          <>
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
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                Visa alla på Impact Loop
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
