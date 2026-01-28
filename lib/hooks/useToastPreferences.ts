'use client'

import { useState, useEffect, useCallback } from 'react'

export type ToastPosition = 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'

export interface ToastPreferences {
  /** Duration in seconds (5, 10, 15, or 0 for disabled) */
  duration: 0 | 5 | 10 | 15
  /** Toast position on screen */
  position: ToastPosition
  /** Whether to show toasts at all */
  enabled: boolean
}

const STORAGE_KEY = 'newstoast_preferences'

const DEFAULT_PREFERENCES: ToastPreferences = {
  duration: 10,
  position: 'bottom-right',
  enabled: true,
}

/**
 * Hook for managing toast notification preferences stored in localStorage.
 * Returns [preferences, setPreferences] similar to useState.
 */
export function useToastPreferences(): [ToastPreferences, (prefs: Partial<ToastPreferences>) => void] {
  const [preferences, setPreferencesState] = useState<ToastPreferences>(DEFAULT_PREFERENCES)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ToastPreferences>
        // Merge with defaults to ensure all fields exist
        setPreferencesState({
          ...DEFAULT_PREFERENCES,
          ...parsed,
        })
      }
    } catch (error) {
      console.error('Failed to load toast preferences:', error)
    }

    setIsHydrated(true)
  }, [])

  // Update preferences and save to localStorage
  const setPreferences = useCallback((newPrefs: Partial<ToastPreferences>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...newPrefs }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
          console.error('Failed to save toast preferences:', error)
        }
      }

      return updated
    })
  }, [])

  // Return defaults until hydrated to avoid hydration mismatch
  return [isHydrated ? preferences : DEFAULT_PREFERENCES, setPreferences]
}

/**
 * Get toast preferences synchronously (for use outside React components).
 * Returns defaults if localStorage is not available or preferences are invalid.
 */
export function getToastPreferences(): ToastPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ToastPreferences>
      return { ...DEFAULT_PREFERENCES, ...parsed }
    }
  } catch {
    // Ignore errors, return defaults
  }

  return DEFAULT_PREFERENCES
}

/**
 * Get Tailwind position classes for a toast position.
 */
export function getPositionClasses(position: ToastPosition): string {
  switch (position) {
    case 'bottom-right':
      return 'bottom-6 right-6'
    case 'top-right':
      return 'top-6 right-6'
    case 'bottom-left':
      return 'bottom-6 left-6'
    case 'top-left':
      return 'top-6 left-6'
    default:
      return 'bottom-6 right-6'
  }
}

/**
 * Get animation classes for entering/leaving based on position.
 */
export function getAnimationClasses(position: ToastPosition, isVisible: boolean, isLeaving: boolean): string {
  const isRight = position.includes('right')

  if (isVisible && !isLeaving) {
    return 'translate-x-0 opacity-100 scale-100'
  }

  // Exit to the side the toast is positioned on
  return isRight
    ? 'translate-x-full opacity-0 scale-95'
    : '-translate-x-full opacity-0 scale-95'
}
