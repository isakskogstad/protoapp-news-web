'use client'

import { useState, useEffect } from 'react'
import { Loader2, ExternalLink, FileText, AlertCircle } from 'lucide-react'

interface PDFPreviewProps {
  url: string
  compact?: boolean
  maxHeight?: number
  onLoadSuccess?: () => void
  onLoadError?: () => void
}

export default function PDFPreview({
  url,
  compact = false,
  maxHeight = 300,
  onLoadSuccess,
  onLoadError
}: PDFPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [useGoogleViewer, setUseGoogleViewer] = useState(false)

  useEffect(() => {
    // Reset state when URL changes
    setLoading(true)
    setError(false)
    setUseGoogleViewer(false)
  }, [url])

  const handleLoad = () => {
    setLoading(false)
    onLoadSuccess?.()
  }

  const handleError = () => {
    // If direct embed fails, try Google Docs viewer
    if (!useGoogleViewer) {
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
  const embedUrl = useGoogleViewer ? googleViewerUrl : url

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8 gap-4"
        style={{ height: compact ? maxHeight : 400 }}
      >
        <AlertCircle className="w-10 h-10 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Kunde inte ladda PDF-förhandsgranskning
        </p>
        <div className="flex gap-2">
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
            href={pdfJsViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Öppna i PDF.js
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Loading indicator */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10"
          style={{ minHeight: compact ? maxHeight : 400 }}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {useGoogleViewer ? 'Laddar via Google Docs...' : 'Laddar PDF...'}
            </p>
          </div>
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
          src={useGoogleViewer ? googleViewerUrl : `${url}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-full bg-white"
          style={{
            height: compact ? maxHeight : '70vh',
            minHeight: compact ? maxHeight : 400
          }}
          onLoad={handleLoad}
          onError={handleError}
          title="PDF-förhandsgranskning"
        />
      </object>

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
