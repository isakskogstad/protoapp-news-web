'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { NewsItem } from '@/lib/types'
import { getLogoUrl, cn } from '@/lib/utils'

interface NewsToastProps {
  item: NewsItem
  onDismiss: () => void
  duration?: number // milliseconds, default 10000
}

export default function NewsToast({ item, onDismiss, duration = 10000 }: NewsToastProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [progress, setProgress] = useState(100)

  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }, [onDismiss])

  // Handle click to navigate
  const handleClick = useCallback(() => {
    router.push(`/news/${item.id}`)
    handleDismiss()
  }, [router, item.id, handleDismiss])

  // Entry animation
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(showTimer)
  }, [])

  // Auto-dismiss timer with progress bar
  useEffect(() => {
    const startTime = Date.now()
    const endTime = startTime + duration

    const progressInterval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const newProgress = (remaining / duration) * 100
      setProgress(newProgress)

      if (remaining <= 0) {
        clearInterval(progressInterval)
        handleDismiss()
      }
    }, 50)

    return () => clearInterval(progressInterval)
  }, [duration, handleDismiss])

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 max-w-sm w-full',
        'transform transition-all duration-300 ease-out',
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      )}
    >
      <div
        className={cn(
          'relative rounded-xl overflow-hidden',
          'bg-[var(--bg-card)] border border-[var(--border)]',
          'shadow-[var(--shadow-card-hover)]'
        )}
      >
        {/* Progress bar at top - subtle */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--muted)] transition-all duration-100 ease-linear opacity-50"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDismiss()
          }}
          className={cn(
            'absolute top-2.5 right-2.5 p-1 rounded-md',
            'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-hover)]',
            'transition-colors duration-150'
          )}
          aria-label="Stäng"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-3.5 pt-4">
          {/* Badge - subtle */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md',
              'text-[10px] font-medium tracking-wide uppercase',
              'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            )}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-40"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)] opacity-70"></span>
              </span>
              Nyhet
            </span>
          </div>

          {/* Headline */}
          <p className="text-sm font-medium text-[var(--foreground)] leading-snug line-clamp-2 mb-2.5 pr-4">
            {item.headline || `Ny händelse för ${item.companyName}`}
          </p>

          {/* Company info + Open button row */}
          <div className="flex items-center justify-between">
            {/* Company info - subtle */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative w-5 h-5 flex-shrink-0 rounded overflow-hidden bg-[var(--bg-hover)]">
                {!logoError && logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[var(--text-muted)] font-medium text-[8px]">
                      {getInitials(item.companyName)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] truncate">
                {item.companyName}
              </span>
            </div>

            {/* Open button */}
            <button
              onClick={handleClick}
              className={cn(
                'flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium',
                'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
                'hover:bg-[var(--border)] hover:text-[var(--foreground)]',
                'transition-colors duration-150'
              )}
            >
              Öppna
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Container component to manage multiple toasts (queue)
interface NewsToastContainerProps {
  items: NewsItem[]
  onDismiss: (id: string) => void
}

export function NewsToastContainer({ items, onDismiss }: NewsToastContainerProps) {
  const latestItem = items[0]

  if (!latestItem) return null

  return (
    <NewsToast
      key={latestItem.id}
      item={latestItem}
      onDismiss={() => onDismiss(latestItem.id)}
    />
  )
}
