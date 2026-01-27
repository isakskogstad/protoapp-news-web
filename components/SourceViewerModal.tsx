'use client'

import { useState, useEffect } from 'react'

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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {sourceType === 'pdf' ? (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {sourceType === 'pdf' ? 'Protokoll' : 'Kungörelse'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sourceType === 'pdf' && sourceUrl && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Ladda ner
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
          {sourceType === 'pdf' && sourceUrl ? (
            <>
              {/* Loading state */}
              {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Laddar dokument...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                  <div className="flex flex-col items-center gap-4 text-center px-8">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Kunde inte ladda dokumentet
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Dokumentet kanske inte finns eller är inte tillgängligt.
                      </p>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
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
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                    Kungörelsetext
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {kungorelseText}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Ingen källa tillgänglig</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
