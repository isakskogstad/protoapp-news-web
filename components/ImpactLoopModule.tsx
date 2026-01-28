'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react'

interface ImpactLoopArticle {
  title: string
  url: string
}

interface ImpactLoopResponse {
  items: ImpactLoopArticle[]
  count: number
  queried: string
  week?: string
  source?: string
  cachedAt?: string
  error?: string
}

interface ImpactLoopModuleProps {
  companyName: string
  orgNumber?: string
  maxItems?: number
  className?: string
}

export default function ImpactLoopModule({
  companyName,
  orgNumber,
  maxItems = 5,
  className = ''
}: ImpactLoopModuleProps) {
  const [articles, setArticles] = useState<ImpactLoopArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      if (!companyName) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Clean company name for search (remove common suffixes like AB, Corp, etc.)
        const cleanName = companyName
          .replace(/\s+(AB|A\/S|AS|Ltd|Inc|Corp|GmbH|Oy|ApS)\.?$/i, '')
          .trim()

        const response = await fetch(
          `/api/impactloop?q=${encodeURIComponent(cleanName)}&limit=${maxItems}`
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: ImpactLoopResponse = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setArticles(data.items || [])
      } catch (err) {
        console.error('ImpactLoopModule error:', err)
        setError(err instanceof Error ? err.message : 'Kunde inte hämta artiklar')
        setArticles([])
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [companyName, maxItems])

  // Don't render anything if loading, error, or no articles
  if (loading) {
    return null // Don't show loading state - just hide until ready
  }

  if (error || articles.length === 0) {
    return null // Hide completely if no articles found
  }

  return (
    <div className={`bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl sm:rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gradient-to-r from-[#f8fafc] to-white dark:from-[#1c2128] dark:to-[#161b22]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 dark:bg-[#0ea5e9]/20 flex items-center justify-center">
            <Newspaper className="w-3.5 h-3.5 text-[#0ea5e9]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a] dark:text-[#e6edf3]">
              Impact Loop
            </h3>
            <p className="text-[10px] text-[#64748b] dark:text-[#8b949e]">
              Omnämnanden av {companyName.replace(/\s+(AB|A\/S|AS|Ltd|Inc|Corp|GmbH|Oy|ApS)\.?$/i, '').trim()}
            </p>
          </div>
        </div>
      </div>

      {/* Articles list */}
      <div className="divide-y divide-gray-100 dark:divide-[#30363d]">
        {articles.map((article, index) => (
          <a
            key={`${article.url}-${index}`}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 px-4 py-3 hover:bg-[#f8fafc] dark:hover:bg-[#21262d] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#0f172a] dark:text-[#e6edf3] group-hover:text-[#0ea5e9] dark:group-hover:text-[#58a6ff] line-clamp-2 leading-snug transition-colors">
                {article.title}
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#94a3b8] dark:text-[#6e7681] group-hover:text-[#0ea5e9] dark:group-hover:text-[#58a6ff] flex-shrink-0 mt-0.5 transition-colors" />
          </a>
        ))}
      </div>

      {/* Footer with source link */}
      <div className="px-4 py-2 bg-[#f8fafc] dark:bg-[#1c2128] border-t border-gray-100 dark:border-[#30363d]">
        <a
          href={`https://www.impactloop.se/search?query=${encodeURIComponent(companyName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#64748b] dark:text-[#8b949e] hover:text-[#0ea5e9] dark:hover:text-[#58a6ff] transition-colors flex items-center gap-1"
        >
          <span>Visa fler på impactloop.se</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  )
}
