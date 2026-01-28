'use client'

import { useState, useEffect } from 'react'
import { Loader2, ExternalLink, FileText, AlertCircle, Search, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

export interface PDFKeyword {
  label: string
  value: string
  category: 'amount' | 'name' | 'date' | 'company' | 'other'
}

interface PDFPreviewProps {
  url: string
  compact?: boolean
  maxHeight?: number
  keywords?: PDFKeyword[]
  onLoadSuccess?: () => void
  onLoadError?: () => void
}

// Category colors for keyword chips
const categoryColors: Record<PDFKeyword['category'], { bg: string; text: string; border: string }> = {
  amount: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  name: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  date: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  company: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  other: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
}

function KeywordChip({ keyword, onCopy }: { keyword: PDFKeyword; onCopy: (value: string) => void }) {
  const [copied, setCopied] = useState(false)
  const colors = categoryColors[keyword.category]

  const handleCopy = () => {
    navigator.clipboard.writeText(keyword.value)
    setCopied(true)
    onCopy(keyword.value)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${colors.bg} ${colors.text} ${colors.border} text-xs font-medium hover:opacity-80 transition-all group`}
      title={`Klicka för att kopiera "${keyword.value}"`}
    >
      <span className="text-[10px] opacity-60 uppercase tracking-wide">{keyword.label}:</span>
      <span className="font-semibold">{keyword.value}</span>
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      )}
    </button>
  )
}

type ViewerMode = 'direct' | 'google' | 'pdfjs' | 'error'

export default function PDFPreview({
  url,
  compact = false,
  maxHeight = 300,
  keywords,
  onLoadSuccess,
  onLoadError
}: PDFPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [viewerMode, setViewerMode] = useState<ViewerMode>('google') // Start with Google Docs for reliability
  const [keywordsExpanded, setKeywordsExpanded] = useState(!compact)
  const [loadAttempts, setLoadAttempts] = useState(0)

  useEffect(() => {
    // Reset state when URL changes
    setLoading(true)
    setViewerMode('google') // Always start with Google Docs viewer for best compatibility
    setLoadAttempts(0)
  }, [url])

  const handleLoad = () => {
    setLoading(false)
    onLoadSuccess?.()
  }

  const handleError = () => {
    console.log('[PDFPreview] Load failed, mode:', viewerMode, 'attempts:', loadAttempts)

    if (viewerMode === 'google' && loadAttempts < 1) {
      // Try PDF.js viewer
      console.log('[PDFPreview] Trying PDF.js viewer')
      setViewerMode('pdfjs')
      setLoadAttempts(prev => prev + 1)
      setLoading(true)
    } else if (viewerMode === 'pdfjs' && loadAttempts < 2) {
      // Try direct URL
      console.log('[PDFPreview] Trying direct URL')
      setViewerMode('direct')
      setLoadAttempts(prev => prev + 1)
      setLoading(true)
    } else {
      // All methods failed
      setViewerMode('error')
      setLoading(false)
      onLoadError?.()
    }
  }

  // Viewer URLs
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
  const pdfJsViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`

  // Determine which URL to use based on mode
  const getEmbedUrl = () => {
    switch (viewerMode) {
      case 'google':
        return googleViewerUrl
      case 'pdfjs':
        return pdfJsViewerUrl
      case 'direct':
        return `${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`
      default:
        return url
    }
  }

  const embedUrl = getEmbedUrl()
  const viewerHeight = compact ? maxHeight : '70vh'
  const minViewerHeight = compact ? maxHeight : 500

  if (viewerMode === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8 gap-4"
        style={{ height: compact ? maxHeight : 400 }}
      >
        <AlertCircle className="w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Kunde inte ladda PDF-förhandsgranskning
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Öppna PDF
          </a>
          <a
            href={googleViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Google Docs
          </a>
        </div>
      </div>
    )
  }

  const hasKeywords = keywords && keywords.length > 0

  return (
    <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Keywords panel */}
      {hasKeywords && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setKeywordsExpanded(!keywordsExpanded)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nyckelord att leta efter
              </span>
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                ({keywords.length})
              </span>
            </div>
            {keywordsExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {keywordsExpanded && (
            <div className="px-3 pb-3 animate-slide-down">
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, idx) => (
                  <KeywordChip
                    key={`${kw.label}-${idx}`}
                    keyword={kw}
                    onCopy={() => {}}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 italic">
                Klicka på ett nyckelord för att kopiera. Använd Ctrl+F / Cmd+F i PDF:en för att söka.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10"
          style={{ minHeight: minViewerHeight }}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {viewerMode === 'google' && 'Laddar via Google Docs...'}
              {viewerMode === 'pdfjs' && 'Laddar via PDF.js...'}
              {viewerMode === 'direct' && 'Laddar PDF...'}
            </p>
          </div>
        </div>
      )}

      {/* PDF embed using iframe */}
      <iframe
        src={embedUrl}
        className="w-full bg-white border-0"
        style={{
          height: viewerHeight,
          minHeight: minViewerHeight
        }}
        onLoad={handleLoad}
        onError={handleError}
        title="PDF-förhandsgranskning"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />

      {/* Compact mode click hint */}
      {compact && !loading && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="text-xs font-medium text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            Klicka för att läsa i helskärm
          </span>
        </div>
      )}
    </div>
  )
}
