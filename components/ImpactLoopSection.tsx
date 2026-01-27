'use client'

import { useState, useEffect } from 'react'
import { ImpactLoopArticle } from '@/lib/types'

interface ImpactLoopSectionProps {
  companyName: string
}

export default function ImpactLoopSection({ companyName }: ImpactLoopSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [articles, setArticles] = useState<ImpactLoopArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (isExpanded && !hasSearched) {
      setIsLoading(true)
      fetch(`/api/impactloop?q=${encodeURIComponent(companyName)}&limit=5`)
        .then(res => res.json())
        .then(data => {
          setArticles(data.articles || [])
          setHasSearched(true)
        })
        .catch(() => setArticles([]))
        .finally(() => setIsLoading(false))
    }
  }, [isExpanded, hasSearched, companyName])

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          Impact Loop om {companyName}
        </span>
        <div className="flex items-center gap-2">
          {hasSearched && (
            <span className="text-xs text-gray-400">
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
        <div className="px-4 pb-4 border-t border-gray-100">
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <p className="py-4 text-sm text-gray-400 text-center">
              Inga artiklar hittades
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 mt-2">
              {articles.map((article, i) => (
                <li key={i} className="py-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:text-blue-600 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                      {article.title}
                    </p>
                    {article.publishedDate && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {article.publishedDate}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
