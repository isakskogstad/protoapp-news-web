'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

interface LinkPreviewCardProps {
  url: string
}

export default function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('Failed to fetch preview')

        const data = await res.json()
        if (mounted && data) {
          setPreview(data)
        }
      } catch {
        if (mounted) {
          setError(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchPreview()

    return () => {
      mounted = false
    }
  }, [url])

  // Don't render anything if loading or error
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-xs text-gray-400">Laddar förhandsgranskning...</span>
      </div>
    )
  }

  if (error || !preview || (!preview.title && !preview.description)) {
    return null
  }

  // Extract domain for display
  const domain = (() => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  })()

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
    >
      <div className="flex">
        {/* Image */}
        {preview.image && (
          <div className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800">
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          {/* Site info */}
          <div className="flex items-center gap-1.5 mb-1">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4 rounded"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {preview.siteName || domain}
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Title */}
          {preview.title && (
            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {preview.title}
            </h4>
          )}

          {/* Description */}
          {preview.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}
