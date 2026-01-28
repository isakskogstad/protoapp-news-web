'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, ChevronRight } from 'lucide-react'
import Image from 'next/image'

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

  // Clean company name for search
  const cleanCompanyName = companyName
    .replace(/\s+(AB|A\/S|AS|Ltd|Inc|Corp|GmbH|Oy|ApS)\.?$/i, '')
    .trim()

  useEffect(() => {
    const fetchArticles = async () => {
      if (!companyName) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/impactloop?q=${encodeURIComponent(cleanCompanyName)}&limit=${maxItems}`
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
  }, [companyName, cleanCompanyName, maxItems])

  // Don't render anything if loading, error, or no articles
  if (loading || error || articles.length === 0) {
    return null
  }

  return (
    <div className={`bg-white dark:bg-[#0d1117] border border-gray-200/80 dark:border-[#30363d] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      {/* Header with ImpactLoop branding */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#f8f9fa] via-white to-[#f8f9fa] dark:from-[#161b22] dark:via-[#0d1117] dark:to-[#161b22] border-b border-gray-100 dark:border-[#21262d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* ImpactLoop Logo */}
            <div className="relative w-6 h-6 flex-shrink-0">
              <Image
                src="/impactloop-logo.avif"
                alt="Impact Loop"
                width={24}
                height={24}
                className="object-contain dark:invert dark:brightness-200"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#0f172a] dark:text-[#e6edf3] tracking-tight">
                Impact Loop
              </span>
              <span className="text-[10px] text-[#64748b] dark:text-[#8b949e] leading-tight">
                {articles.length} omnämnande{articles.length !== 1 ? 'n' : ''}
              </span>
            </div>
          </div>

          {/* View all link */}
          <a
            href={`https://www.impactloop.se/search?query=${encodeURIComponent(cleanCompanyName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium text-[#0ea5e9] hover:text-[#0284c7] dark:text-[#58a6ff] dark:hover:text-[#79c0ff] transition-colors flex items-center gap-0.5"
          >
            Visa alla
            <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Articles list */}
      <div className="divide-y divide-gray-100/80 dark:divide-[#21262d]">
        {articles.map((article, index) => (
          <a
            key={`${article.url}-${index}`}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 px-4 py-3 hover:bg-[#f8fafc] dark:hover:bg-[#161b22] transition-all duration-150"
          >
            {/* Article number indicator */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#f1f5f9] dark:bg-[#21262d] flex items-center justify-center mt-0.5 group-hover:bg-[#0ea5e9]/10 dark:group-hover:bg-[#58a6ff]/10 transition-colors">
              <span className="text-[10px] font-medium text-[#64748b] dark:text-[#8b949e] group-hover:text-[#0ea5e9] dark:group-hover:text-[#58a6ff] transition-colors">
                {index + 1}
              </span>
            </div>

            {/* Article content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#1e293b] dark:text-[#c9d1d9] group-hover:text-[#0ea5e9] dark:group-hover:text-[#58a6ff] line-clamp-2 leading-snug transition-colors font-medium">
                {article.title}
              </p>
            </div>

            {/* External link icon */}
            <ExternalLink className="w-3.5 h-3.5 text-[#cbd5e1] dark:text-[#484f58] group-hover:text-[#0ea5e9] dark:group-hover:text-[#58a6ff] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150" />
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[#f8f9fa] dark:bg-[#161b22] border-t border-gray-100 dark:border-[#21262d]">
        <p className="text-[10px] text-[#94a3b8] dark:text-[#6e7681] text-center">
          Nyheter från{' '}
          <a
            href="https://www.impactloop.se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#64748b] dark:text-[#8b949e] hover:text-[#0ea5e9] dark:hover:text-[#58a6ff] transition-colors"
          >
            impactloop.se
          </a>
        </p>
      </div>
    </div>
  )
}
