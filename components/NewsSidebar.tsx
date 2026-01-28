'use client'

import { useState, useEffect } from 'react'
import { Newspaper, ChevronDown, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Article {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

interface NewsSidebarProps {
  companyName: string
  matchHeight?: boolean // Match sibling height, make content scrollable
}

export default function NewsSidebar({ companyName, matchHeight = false }: NewsSidebarProps) {
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
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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
        transition-all duration-500 ease-out
        ${matchHeight ? 'h-full flex flex-col' : 'space-y-4'}
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
    >
      {/* News Coverage Module - Only show if articles exist */}
      {!newsLoading && newsArticles.length > 0 && (
        <section className={`bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-[#30363d] overflow-hidden shadow-sm flex flex-col ${matchHeight ? 'flex-1 h-full' : ''}`} style={matchHeight ? { minHeight: '200px' } : { maxHeight: '320px' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#30363d] flex items-center gap-3 shrink-0">
            <Newspaper className="w-4 h-4 text-[#64748b] dark:text-[#8b949e]" />
            <h3 className="text-xs font-semibold text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider">
              Nyheter om {companyName}
            </h3>
          </div>

          {/* Articles - scrollable */}
          <ul className="divide-y divide-gray-100 dark:divide-[#21262d] overflow-y-auto flex-1">
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
                  className="flex items-start gap-3 px-5 py-3 hover:bg-[#f8fafc] dark:hover:bg-[#21262d] transition-colors group"
                >
                  <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3] line-clamp-1 leading-snug group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff] transition-colors flex-1">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 text-[9px] font-mono text-[#94a3b8] dark:text-[#6e7681]">
                    {article.source && <span>{article.source}</span>}
                    {article.publishedDate && (
                      <>
                        <span className="text-gray-300 dark:text-[#30363d]">·</span>
                        <span>{article.publishedDate}</span>
                      </>
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
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          {/* Expandable button */}
          <button
            onClick={() => setImpactExpanded(!impactExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/impactloop-logo.svg"
                alt="Impact Loop"
                width={18}
                height={18}
                className="opacity-70 dark:opacity-50"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Impact Loop
              </span>
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {impactArticles.length}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${impactExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Expandable content */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${impactExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              {impactArticles.map((article, i) => (
                <li key={i}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <p className="text-sm font-medium text-black dark:text-white line-clamp-2 leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {article.title}
                    </p>
                    {article.publishedDate && (
                      <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-1">
                        {article.publishedDate}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            {/* Link to full search */}
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
              <a
                href={`https://www.impactloop.se/search?query=${encodeURIComponent(companyName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Visa alla på impactloop.se
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
