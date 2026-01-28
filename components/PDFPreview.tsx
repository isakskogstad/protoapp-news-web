'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker - using CDN for the worker file
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

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
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [scale, setScale] = useState(1.0)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    onLoadSuccess?.()
  }, [onLoadSuccess])

  const onDocumentLoadError = useCallback(() => {
    setLoading(false)
    setError(true)
    onLoadError?.()
  }, [onLoadError])

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1))
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1))

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.0))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8" style={{ height: maxHeight }}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kunde inte ladda PDF
        </p>
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
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Laddar PDF...</p>
          </div>
        </div>
      )}

      {/* PDF Document */}
      <div
        className="overflow-auto"
        style={{ maxHeight: compact ? maxHeight : '70vh' }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={compact ? 0.7 : scale}
            renderTextLayer={!compact}
            renderAnnotationLayer={!compact}
            className="shadow-lg"
          />
        </Document>
      </div>

      {/* Controls */}
      {!loading && numPages && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-center justify-between">
            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-white/90">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom controls - only in non-compact mode */}
            {!compact && (
              <div className="flex items-center gap-2">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-white/90 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 2.0}
                  className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact mode click hint */}
      {compact && !loading && (
        <div className="absolute inset-0 flex items-end justify-center pb-14 pointer-events-none">
          <span className="text-xs font-medium text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            Klicka för att läsa i helskärm
          </span>
        </div>
      )}
    </div>
  )
}
