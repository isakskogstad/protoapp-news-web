'use client'

import { useState, useEffect } from 'react'
import { X, Download, ExternalLink, FileText, Loader2 } from 'lucide-react'

interface SourceViewerModalProps {
  isOpen: boolean
  onClose: () => void
  sourceUrl?: string
  sourceType?: 'pdf' | 'kungorelse' | 'external'
  kungorelseText?: string
  companyName: string
}

export default function SourceViewerModal({
  isOpen,
  onClose,
  sourceUrl,
  sourceType,
  kungorelseText,
  companyName
}: SourceViewerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(false)
    }
  }, [isOpen, sourceUrl])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleDownload = () => {
    if (sourceUrl) {
      window.open(sourceUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-scale-in flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              {sourceType === 'pdf' ? (
                <FileText className="w-4 h-4 text-red-500" />
              ) : (
                <FileText className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white">
                {sourceType === 'pdf' ? 'Protokoll' : 'Kungörelse'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sourceType === 'pdf' && sourceUrl && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Ladda ner
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
          {sourceType === 'pdf' && sourceUrl ? (
            <>
              {/* Loading state */}
              {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">Laddar dokument...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="flex flex-col items-center gap-4 text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center">
                      <X className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-black dark:text-white mb-1">
                        Kunde inte ladda dokumentet
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Dokumentet kanske inte finns eller är inte tillgängligt.
                      </p>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black dark:bg-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Öppna i ny flik
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF iframe */}
              <iframe
                src={sourceUrl}
                className="w-full h-full"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false)
                  setError(true)
                }}
                title="PDF-dokument"
              />
            </>
          ) : sourceType === 'kungorelse' && kungorelseText ? (
            <div className="p-8 overflow-auto h-full">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    Kungörelsetext
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                    {kungorelseText}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen källa tillgänglig</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
