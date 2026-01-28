'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, ExternalLink, FileText, AlertCircle, Search, ChevronDown, ChevronUp, Copy, Check, HardDrive } from 'lucide-react'
import { getCachedPDF, cachePDF } from '@/lib/pdfCache'

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
      title={`Klicka for att kopiera "${keyword.value}"`}
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

export default function PDFPreview({
  url,
  compact = false,
  maxHeight = 300,
  keywords,
  onLoadSuccess,
  onLoadError
}: PDFPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [useGoogleViewer, setUseGoogleViewer] = useState(false)
  const [keywordsExpanded, setKeywordsExpanded] = useState(!compact) // Expanded by default in fullscreen
  const [isFromCache, setIsFromCache] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Laddar PDF...')
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Reset state when URL changes
    setLoading(true)
    setError(false)
    setUseGoogleViewer(false)
    setIsFromCache(false)
    setLoadingMessage('Laddar PDF...')

    // Clean up previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setObjectUrl(null)

    // Try to load from cache or fetch
    loadPDF()

    // Cleanup on unmount
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [url])

  const loadPDF = async () => {
    try {
      // Check if PDF is in cache
      setLoadingMessage('Kontrollerar cache...')
      const cached = await getCachedPDF(url)

      if (cached) {
        // Use cached blob
        console.log('[PDFPreview] Loading from cache:', url)
        setLoadingMessage('Laddar fran cache...')
        const blobUrl = URL.createObjectURL(cached)
        objectUrlRef.current = blobUrl
        setObjectUrl(blobUrl)
        setIsFromCache(true)
        return
      }

      // Not in cache, fetch the PDF
      console.log('[PDFPreview] Fetching PDF:', url)
      setLoadingMessage('Hamtar PDF...')

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()

      // Verify it's a PDF
      if (!blob.type.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) {
        console.warn('[PDFPreview] Response may not be a PDF:', blob.type)
      }

      // Cache the PDF (don't await, let it happen in background)
      setLoadingMessage('Cacchar PDF...')
      cachePDF(url, blob).catch(err => {
        console.warn('[PDFPreview] Failed to cache PDF:', err)
      })

      // Create object URL for display
      const blobUrl = URL.createObjectURL(blob)
      objectUrlRef.current = blobUrl
      setObjectUrl(blobUrl)
      setIsFromCache(false)

    } catch (err) {
      console.error('[PDFPreview] Failed to load PDF:', err)
      // Fall back to direct URL embedding
      setObjectUrl(null)
      setIsFromCache(false)
    }
  }

  const handleLoad = () => {
    setLoading(false)
    onLoadSuccess?.()
  }

  const handleError = () => {
    // If using object URL failed, try direct URL
    if (objectUrl) {
      console.log('[PDFPreview] Object URL failed, trying direct URL')
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setObjectUrl(null)
      setIsFromCache(false)
      return
    }

    // If direct embed fails, try Google Docs viewer
    if (!useGoogleViewer) {
      console.log('[PDFPreview] Direct embed failed, trying Google Docs viewer')
      setUseGoogleViewer(true)
      setLoading(true)
    } else {
      setLoading(false)
      setError(true)
      onLoadError?.()
    }
  }

  // Google Docs viewer URL for fallback
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`

  // PDF.js viewer URL (Mozilla's free hosted viewer)
  const pdfJsViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`

  // Determine which URL to use
  const embedUrl = useGoogleViewer
    ? googleViewerUrl
    : (objectUrl || url)

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8 gap-4"
        style={{ height: compact ? maxHeight : 400 }}
      >
        <AlertCircle className="w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Kunde inte ladda PDF-forhandsgranskning
        </p>
        <div className="flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Oppna PDF
          </a>
          <a
            href={pdfJsViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Oppna i PDF.js
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
                Klicka pa ett nyckelord for att kopiera. Anvand Ctrl+F / Cmd+F i PDF:en for att soka.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10"
          style={{ minHeight: compact ? maxHeight : 400 }}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {useGoogleViewer ? 'Laddar via Google Docs...' : loadingMessage}
            </p>
          </div>
        </div>
      )}

      {/* Cached badge */}
      {isFromCache && !loading && (
        <div className="absolute top-2 right-2 z-20">
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50 rounded-full shadow-sm">
            <HardDrive className="w-3 h-3" />
            Cachad
          </span>
        </div>
      )}

      {/* PDF embed - use object tag for better compatibility */}
      <object
        data={`${embedUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
        type="application/pdf"
        className="w-full bg-white"
        style={{
          height: compact ? maxHeight : '70vh',
          minHeight: compact ? maxHeight : 400
        }}
        onLoad={handleLoad}
        onError={handleError}
      >
        {/* Fallback content if object doesn't render */}
        <iframe
          src={useGoogleViewer ? googleViewerUrl : `${objectUrl || url}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-full bg-white"
          style={{
            height: compact ? maxHeight : '70vh',
            minHeight: compact ? maxHeight : 400
          }}
          onLoad={handleLoad}
          onError={handleError}
          title="PDF-forhandsgranskning"
        />
      </object>

      {/* Compact mode click hint */}
      {compact && !loading && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="text-xs font-medium text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            Klicka for att lasa i helskarm
          </span>
        </div>
      )}
    </div>
  )
}
