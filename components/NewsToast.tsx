'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { NewsItem } from '@/lib/types'
import { getLogoUrl, cn } from '@/lib/utils'
import {
  ToastPreferences,
  getPositionClasses,
  getAnimationClasses,
} from '@/lib/hooks/useToastPreferences'

interface NewsToastProps {
  item: NewsItem
  onDismiss: () => void
  preferences: ToastPreferences
}

export default function NewsToast({ item, onDismiss, preferences }: NewsToastProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const [entryPulseActive, setEntryPulseActive] = useState(false)

  // Convert duration from seconds to milliseconds
  const durationMs = preferences.duration * 1000
  const remainingTimeRef = useRef(durationMs)

  const logoUrl = getLogoUrl(item.orgNumber, item.logoUrl)

  // Check if this is a high-value news item (8-10)
  const isHighValue = (item.newsValue ?? 0) >= 8

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

  // Entry animation + entry pulse for high-value items
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true)
      // Trigger entry pulse for high-value items after entry animation
      if (isHighValue) {
        setTimeout(() => {
          setEntryPulseActive(true)
          // Remove the pulse class after animation completes
          setTimeout(() => setEntryPulseActive(false), 600)
        }, 300) // Wait for entry animation to complete
      }
    }, 50)
    return () => clearTimeout(showTimer)
  }, [isHighValue])

  // Reset remaining time when duration changes
  useEffect(() => {
    remainingTimeRef.current = durationMs
  }, [durationMs])

  // Auto-dismiss timer with progress bar (pausable)
  useEffect(() => {
    // If duration is 0, toast stays until manually dismissed (no auto-dismiss)
    if (durationMs === 0) {
      setProgress(100) // Keep progress bar full
      return
    }

    if (isPaused) return

    const startTime = Date.now()
    const initialRemaining = remainingTimeRef.current

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, initialRemaining - elapsed)
      remainingTimeRef.current = remaining
      const newProgress = (remaining / durationMs) * 100
      setProgress(newProgress)

      if (remaining <= 0) {
        clearInterval(progressInterval)
        handleDismiss()
      }
    }, 50)

    return () => clearInterval(progressInterval)
  }, [durationMs, handleDismiss, isPaused])

  // Hover handlers for pausing
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false)
  }, [])

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const positionClasses = getPositionClasses(preferences.position)
  const animationClasses = getAnimationClasses(preferences.position, isVisible, isLeaving)

  return (
    <div
      className={cn(
        'fixed z-50 max-w-sm w-full',
        positionClasses,
        'transform transition-all duration-300 ease-out',
        animationClasses
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* CSS for high-value animations */}
      <style jsx>{`
        @keyframes ping-fast {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        @keyframes entry-pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.1),
                        0 4px 12px -2px rgba(15, 23, 42, 0.05),
                        0 0 0 0 rgba(30, 64, 175, 0);
          }
          50% {
            box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.1),
                        0 4px 12px -2px rgba(15, 23, 42, 0.05),
                        0 0 20px 2px rgba(30, 64, 175, 0.12);
          }
        }

        :global(.dark) .glow-pulse-card {
          animation-name: glow-pulse-dark !important;
        }

        @keyframes glow-pulse-dark {
          0%, 100% {
            box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5),
                        0 4px 12px -2px rgba(0, 0, 0, 0.3),
                        0 0 0 0 rgba(88, 166, 255, 0);
          }
          50% {
            box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5),
                        0 4px 12px -2px rgba(0, 0, 0, 0.3),
                        0 0 24px 3px rgba(88, 166, 255, 0.18);
          }
        }

        .ping-fast-dot {
          animation: ping-fast 0.75s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .entry-pulse-card {
          animation: entry-pulse 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glow-pulse-card {
          animation: glow-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className={cn(
          'relative rounded-xl overflow-hidden',
          'bg-[var(--bg-card)] border',
          isHighValue
            ? 'border-[var(--accent)]/30 glow-pulse-card'
            : 'border-[var(--border)] shadow-[var(--shadow-card-hover)]',
          entryPulseActive && 'entry-pulse-card'
        )}
      >
        {/* Progress bar at top - accent color for high-value (hidden when duration is 0) */}
        {preferences.duration > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--border)]">
            <div
              className={cn(
                'h-full',
                isHighValue ? 'bg-[var(--accent)] opacity-70' : 'bg-[var(--muted)] opacity-50',
                isPaused ? 'transition-none' : 'transition-all duration-100 ease-linear'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

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
          aria-label="Stang"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-3.5 pt-4">
          {/* Badge - enhanced for high-value */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md',
              'text-[10px] font-medium tracking-wide uppercase',
              isHighValue
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            )}>
              <span className={cn(
                'relative flex',
                isHighValue ? 'h-2 w-2' : 'h-1.5 w-1.5'
              )}>
                <span className={cn(
                  'absolute inline-flex h-full w-full rounded-full bg-[var(--accent)]',
                  isHighValue ? 'ping-fast-dot opacity-60' : 'animate-ping opacity-40'
                )}></span>
                <span className={cn(
                  'relative inline-flex rounded-full bg-[var(--accent)]',
                  isHighValue ? 'h-2 w-2 opacity-90' : 'h-1.5 w-1.5 opacity-70'
                )}></span>
              </span>
              Nyhet
            </span>
          </div>

          {/* Headline - uses AI-generated rubrik (via item.headline), with fallbacks */}
          <p className="text-sm font-medium text-[var(--foreground)] leading-snug line-clamp-2 mb-2.5 pr-4">
            {item.headline || item.noticeText?.slice(0, 80) || `Ny handelse for ${item.companyName}`}
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

            {/* Open button - accent style for high-value */}
            <button
              onClick={handleClick}
              className={cn(
                'flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium',
                'transition-colors duration-150',
                isHighValue
                  ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-light)]'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--foreground)]'
              )}
            >
              Oppna
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
  preferences: ToastPreferences
}

export function NewsToastContainer({ items, onDismiss, preferences }: NewsToastContainerProps) {
  // Don't render anything if toasts are disabled
  if (!preferences.enabled) return null

  const latestItem = items[0]

  if (!latestItem) return null

  return (
    <NewsToast
      key={latestItem.id}
      item={latestItem}
      onDismiss={() => onDismiss(latestItem.id)}
      preferences={preferences}
    />
  )
}
