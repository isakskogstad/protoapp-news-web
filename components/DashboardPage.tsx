'use client'

import React from 'react'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, Settings,
  Activity, Bookmark, BookmarkCheck, Share2, Link2, Check, X, Menu
} from 'lucide-react'
import { NewsItem } from '@/lib/types'
import { formatRelativeTime, getLogoUrl, formatOrgNumber, truncateWords } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from './ThemeProvider'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useSSE } from '@/lib/hooks/useSSE'
// Using native img for profile images with error handling
import GlobalSidebar from './GlobalSidebar'
import NotificationDropdown from './NotificationDropdown'

interface DashboardPageProps {
  initialItems: NewsItem[]
}

// Bookmark utilities
const BOOKMARKS_KEY = 'loopdesk_bookmarks'

function getBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const stored = localStorage.getItem(BOOKMARKS_KEY)
  return stored ? new Set(JSON.parse(stored)) : new Set()
}

function toggleBookmark(id: string): boolean {
  const bookmarks = getBookmarks()
  if (bookmarks.has(id)) {
    bookmarks.delete(id)
  } else {
    bookmarks.add(id)
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(bookmarks)))
  return bookmarks.has(id)
}

// Notification utilities are now imported from useNotifications hook

// Settings Modal
function SettingsModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 id="settings-modal-title" className="text-lg font-bold text-black dark:text-white">Inställningar</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            aria-label="Stäng inställningar"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Välj tema">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  role="radio"
                  aria-checked={theme === t}
                  className={`px-4 py-2.5 text-sm rounded-lg border transition-all ${
                    theme === t
                      ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {t === 'light' ? 'Ljust' : t === 'dark' ? 'Mörkt' : 'System'}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notiser</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hantera notiser via klocksymbolen i headern.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  )
}

// Profile Dropdown
function ProfileDropdown({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const { data: session } = useSession()
  const userName = session?.user?.name || 'Användare'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image
  const [imgError, setImgError] = useState(false)
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2 z-50 min-w-[240px]"
        role="menu"
        aria-label="Profilmeny"
      >
        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {userImage && !imgError ? (
              <img
                src={userImage}
                alt={userName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">{userName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1" role="group">
          <button
            onClick={() => { onOpenSettings(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            role="menuitem"
          >
            <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            Inställningar
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-1" role="group">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logga ut
          </button>
        </div>
      </div>
    </>
  )
}

// Dashboard Header
function DashboardHeader({
  onOpenSettings,
  searchQuery,
  onSearchChange
}: {
  onOpenSettings: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}) {
  const { data: session } = useSession()
  const userName = session?.user?.name || 'Användare'
  const userImage = session?.user?.image
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800" role="banner">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Left: Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="LoopDesk - Gå till startsidan">
            <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center font-bold text-lg transition-transform group-hover:scale-105" aria-hidden="true">
              L
            </div>
            <span className="text-xl tracking-tight text-black dark:text-white hidden sm:inline" aria-hidden="true">
              LOOP<span className="text-gray-400 dark:text-gray-500">DESK</span>
            </span>
          </Link>

        </div>

        {/* Center: Search - Desktop */}
        <div className="hidden md:block flex-1 max-w-md mx-8" role="search">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Sök bolag, person eller nyckelord..."
              aria-label="Sök i nyheter"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-black dark:text-white"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Rensa sökning"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1" aria-hidden="true">
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">⌘K</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Mobile Search + Profile & Notifications */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Sök"
          >
            <Search className="w-5 h-5" />
          </button>

          <NotificationDropdown />

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden sm:block" />

          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
              aria-expanded={showProfileDropdown}
              aria-haspopup="menu"
              aria-label="Öppna profilmeny"
            >
              <div className="text-right hidden sm:block group-hover:opacity-80">
                <div className="text-xs font-bold leading-none text-black dark:text-white">{userName.split(' ')[0]}</div>
                <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 leading-none mt-0.5">REDAKTÖR</div>
              </div>
              {userImage && !imageError ? (
                <img
                  src={userImage}
                  alt={userName}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-sm font-medium">
                  {initials}
                </div>
              )}
            </button>

            {showProfileDropdown && (
              <ProfileDropdown
                onClose={() => setShowProfileDropdown(false)}
                onOpenSettings={onOpenSettings}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar - slides down when active */}
      {showMobileSearch && (
        <div className="md:hidden px-4 pb-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 animate-slide-down" role="search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Sök bolag, person eller nyckelord..."
              aria-label="Sök i nyheter"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-black dark:text-white"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Rensa sökning"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

// Logo cache utilities
const LOGO_CACHE_KEY = 'loopdesk_logo_cache'
const LOGO_CACHE_VERSION = 1
const LOGO_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

interface LogoCacheEntry {
  url: string
  dataUrl: string
  timestamp: number
  version: number
}

function getLogoCache(): Record<string, LogoCacheEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(LOGO_CACHE_KEY)
    if (!stored) return {}
    const cache = JSON.parse(stored)
    // Filter out expired entries
    const now = Date.now()
    const valid: Record<string, LogoCacheEntry> = {}
    for (const [key, entry] of Object.entries(cache)) {
      const e = entry as LogoCacheEntry
      if (e.version === LOGO_CACHE_VERSION && now - e.timestamp < LOGO_CACHE_MAX_AGE) {
        valid[key] = e
      }
    }
    return valid
  } catch {
    return {}
  }
}

function saveLogoToCache(orgNumber: string, url: string, dataUrl: string) {
  if (typeof window === 'undefined') return
  try {
    const cache = getLogoCache()
    cache[orgNumber] = {
      url,
      dataUrl,
      timestamp: Date.now(),
      version: LOGO_CACHE_VERSION
    }
    // Limit cache size (max 100 logos)
    const keys = Object.keys(cache)
    if (keys.length > 100) {
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      for (let i = 0; i < keys.length - 100; i++) {
        delete cache[sorted[i]]
      }
    }
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

function getCachedLogo(orgNumber: string, url: string): string | null {
  const cache = getLogoCache()
  const entry = cache[orgNumber]
  if (entry && entry.url === url) {
    return entry.dataUrl
  }
  return null
}

// Company Logo Component with caching - memoized
const CompanyLogo = React.memo(function CompanyLogo({ orgNumber, companyName, logoUrl, size = 'md' }: {
  orgNumber: string
  companyName: string
  logoUrl?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const url = getLogoUrl(orgNumber, logoUrl)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const initials = companyName.substring(0, 2).toUpperCase()

  // Check cache on mount
  useEffect(() => {
    if (!url) {
      setError(true)
      setLoading(false)
      return
    }

    // Check cache first
    const cached = getCachedLogo(orgNumber, url)
    if (cached) {
      setDisplayUrl(cached)
      setLoading(false)
      return
    }

    // No cache, will load from network
    setDisplayUrl(url)
  }, [url, orgNumber])

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoading(false)
    // Cache the image if not already cached
    if (url && !getCachedLogo(orgNumber, url)) {
      try {
        const img = e.currentTarget
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png', 0.8)
          // Only cache if not too large (< 50KB)
          if (dataUrl.length < 50000) {
            saveLogoToCache(orgNumber, url, dataUrl)
          }
        }
      } catch {
        // CORS or other error, skip caching
      }
    }
  }

  // Fallback: show initials in a subtle rounded container
  if (!url || error) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-xs`}>
        {initials}
      </div>
    )
  }

  // Logo: show directly with rounded corners, no container
  return (
    <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-xl skeleton-shimmer" />
      )}
      {displayUrl && (
        <img
          src={displayUrl}
          alt=""
          crossOrigin="anonymous"
          className={`w-full h-full object-contain rounded-xl transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleLoad}
          onError={() => { setError(true); setLoading(false) }}
        />
      )}
    </div>
  )
})

// Share Menu Component
function ShareMenu({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50 min-w-[180px]">
      <button
        onClick={copyLink}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
        {copied ? 'Kopierad!' : 'Kopiera länk'}
      </button>
      <button
        onClick={() => {
          window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`, '_blank')
          onClose()
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        E-posta
      </button>
    </div>
  )
}

// Smart time formatting with recency info
interface SmartTime {
  text: string
  isRecent: boolean   // Within last hour
  isToday: boolean    // Published today
}

function formatSmartTime(dateString: string): SmartTime {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    // Same day check
    const isToday = date.toDateString() === now.toDateString()

    // Under 1 hour: "X min"
    if (diffMins < 60) {
      return {
        text: `${Math.max(1, diffMins)} min`,
        isRecent: true,
        isToday: true
      }
    }

    // Same day (and within last 24h): show time "HH:MM"
    if (isToday) {
      return {
        text: date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
        isRecent: false,
        isToday: true
      }
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return {
        text: `I går ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`,
        isRecent: false,
        isToday: false
      }
    }

    // Same week: weekday + time
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays < 7) {
      const weekday = date.toLocaleDateString('sv-SE', { weekday: 'short' })
      return {
        text: `${weekday} ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`,
        isRecent: false,
        isToday: false
      }
    }

    // Older: date
    return {
      text: date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      isRecent: false,
      isToday: false
    }
  } catch {
    return { text: dateString, isRecent: false, isToday: false }
  }
}

// Timeline period types
type TimelinePeriod = 'minutes' | 'hours' | 'today' | 'yesterday' | 'thisWeek' | 'older'

// Get timeline period for a date
function getTimelinePeriod(dateString: string): TimelinePeriod {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Under 1 hour: minutes
    if (diffMins < 60) return 'minutes'

    // Same day: hours
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return 'hours'

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'yesterday'

    // This week (within 7 days)
    if (diffDays < 7) return 'thisWeek'

    // Older
    return 'older'
  } catch {
    return 'older'
  }
}

// Format timeline label for a period
function getTimelinePeriodLabel(period: TimelinePeriod): string {
  switch (period) {
    case 'minutes': return 'Senaste timmen'
    case 'hours': return 'Idag'
    case 'today': return 'Idag'
    case 'yesterday': return 'Igår'
    case 'thisWeek': return 'Denna vecka'
    case 'older': return 'Tidigare'
  }
}

// Timeline marker component
function TimelineMarker({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${isFirst ? '' : 'mt-2'}`}>
      <div className="w-16 flex justify-end">
        <span className="text-[10px] font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-gray-100 dark:ring-gray-900" />
      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
    </div>
  )
}

// Timeline item wrapper
function TimelineItemWrapper({
  children,
  isLast,
  showDot = true
}: {
  children: React.ReactNode
  isLast: boolean
  showDot?: boolean
}) {
  return (
    <div className="flex">
      {/* Timeline column */}
      <div className="w-16 shrink-0 flex flex-col items-end pr-3 relative">
        {/* Vertical line */}
        {!isLast && (
          <div className="absolute right-[11px] top-3 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
        )}
      </div>

      {/* Dot */}
      <div className="shrink-0 relative z-10">
        {showDot && (
          <div className="w-2 h-2 mt-5 rounded-full bg-gray-300 dark:bg-gray-700" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pl-3">
        {children}
      </div>
    </div>
  )
}

// Allowed kungörelse categories (only Konkurs and Kallelse are news-worthy)
const ALLOWED_KUNGORELSE_CATEGORIES = ['konkurs', 'kallelse']

// Cutoff date for kungörelser - only show from 2026-01-22 and later
const KUNGORELSE_CUTOFF_DATE = new Date('2026-01-22T00:00:00Z')

// Filter function: only show news-worthy items
// Kungörelser with "Ändringar" or other non-news categories are excluded
function isNewsWorthy(item: NewsItem): boolean {
  // Protocol analyses are always news-worthy
  if (item.type === 'protocol') return true

  // For kungörelser, check the category and date
  if (item.type === 'kungorelse') {
    // Date filter: exclude kungörelser before 2026-01-22
    const itemDate = item.timestamp ? new Date(item.timestamp) : null
    if (itemDate && itemDate < KUNGORELSE_CUTOFF_DATE) {
      return false
    }

    const amnesomrade = (item.kungorelse?.amnesomrade || '').toLowerCase()

    // Only show Konkurs and Kallelse kungörelser
    if (ALLOWED_KUNGORELSE_CATEGORIES.some(cat => amnesomrade.includes(cat))) {
      return true
    }

    // Also check headline/protocolType as fallback
    const headline = (item.headline || '').toLowerCase()
    const pType = (item.protocolType || '').toLowerCase()

    if (headline.includes('konkurs') || pType.includes('konkurs')) return true
    if (headline.includes('kallelse') || pType.includes('kallelse')) return true
    if (headline.includes('stämma') || pType.includes('stämma')) return true

    // Exclude everything else (Ändringar, Registreringar, etc.)
    return false
  }

  // Unknown types - show by default
  return true
}

// Get category from item
function getCategory(item: NewsItem): string {
  // Check protocol type first
  const pType = (item.protocolType || '').toLowerCase()
  if (pType.includes('konkurs')) return 'Konkurs'
  if (pType.includes('kallelse') || pType.includes('årsstämma') || pType.includes('extra bolagsstämma')) {
    if (pType.includes('extra')) return 'Extra bolagsstämma'
    if (pType.includes('årsstämma')) return 'Årsstämma'
    return 'Kallelse till stämma'
  }
  if (pType.includes('styrelse')) return 'Styrelsemöte'

  // Check headline
  const headline = (item.headline || '').toLowerCase()
  if (headline.includes('konkurs')) return 'Konkurs'
  if (headline.includes('nyemission') || headline.includes('emission')) return 'Nyemission'
  if (headline.includes('kallelse') || headline.includes('stämma')) return 'Kallelse till stämma'
  if (headline.includes('styrelse')) return 'Styrelseändring'
  if (headline.includes('vd')) return 'VD-byte'

  // Fallback to protocol type or generic
  if (item.protocolType) return item.protocolType
  return 'Händelse'
}

// Format category for display (handle snake_case and make readable)
function formatCategory(category: string): string {
  // Convert snake_case to readable format
  // Note: \b doesn't work with Swedish chars (ä,ö,å), so we use lowercase + capitalize after whitespace
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase())
}

// News Item Component - Clean vertical layout in left column
// Memoized to prevent re-renders when parent state changes
interface NewsItemCardProps {
  item: NewsItem
  onBookmarkChange?: () => void
}

const NewsItemCard = React.memo(function NewsItemCard({ item, onBookmarkChange }: NewsItemCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    setIsBookmarked(getBookmarks().has(item.id))
  }, [item.id])

  const category = getCategory(item)
  const categoryColors: Record<string, string> = {
    'Nyemission': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',
    'Konkurs': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    'Kallelse till stämma': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    'Årsstämma': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    'Extra Bolagsstämma': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    'Styrelsemöte': 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
    'Styrelseändring': 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
    'VD-byte': 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
  }
  const formattedCategory = formatCategory(category)
  const categoryColor = categoryColors[formattedCategory] || categoryColors[category] || 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
  const newsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/news/${item.id}`

  // Get time with recency info for visual hierarchy
  const timeInfo = formatSmartTime(item.timestamp)

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newState = toggleBookmark(item.id)
    setIsBookmarked(newState)
    onBookmarkChange?.()
  }

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowShareMenu(!showShareMenu)
  }

  return (
    <Link href={`/news/${item.id}`} className="block group">
      <article className="relative bg-white dark:bg-gray-900 shadow-sm border border-gray-100/80 dark:border-gray-800 rounded-xl hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-150 px-6 py-4">
        {/* Action buttons - vertical stack on far right, visible on hover/focus */}
        <div className="absolute right-3 top-3 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity md:opacity-100">
          <button
            onClick={handleBookmark}
            className={`p-2 rounded-md transition-all touch-manipulation ${
              isBookmarked
                ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/40'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label={isBookmarked ? 'Ta bort bokmärke' : 'Spara som bokmärke'}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
          </button>

          <div className="relative">
            <button
              onClick={handleShare}
              className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all touch-manipulation"
              aria-label="Dela nyhet"
              aria-expanded={showShareMenu}
              aria-haspopup="menu"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
            </button>

            {showShareMenu && (
              <ShareMenu
                url={newsUrl}
                title={item.headline || item.companyName}
                onClose={() => setShowShareMenu(false)}
              />
            )}
          </div>
        </div>

        <div className="flex gap-4 pr-10">
          {/* Left column: Vertical stack - Logo, Company, Org, Category, Time */}
          <div className="w-28 shrink-0 flex flex-col">
            {/* Logo - top, left-aligned */}
            <CompanyLogo
              orgNumber={item.orgNumber}
              companyName={item.companyName}
              logoUrl={item.logoUrl}
              size="md"
            />

            {/* Company name */}
            <h4 className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2 leading-tight line-clamp-2">
              {item.companyName}
            </h4>

            {/* Org number */}
            <p className="text-[9px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">
              {formatOrgNumber(item.orgNumber)}
            </p>

            {/* Category badge */}
            <span className={`mt-2 text-[9px] font-medium px-1.5 py-0.5 rounded w-fit ${categoryColor}`}>
              {formattedCategory}
            </span>

            {/* Time - at bottom of left column */}
            <p className={`mt-auto pt-2 font-mono ${
              timeInfo.isRecent
                ? 'text-[10px] font-semibold text-gray-600 dark:text-gray-400'
                : timeInfo.isToday
                  ? 'text-[10px] text-gray-500 dark:text-gray-500'
                  : 'text-[9px] text-gray-400 dark:text-gray-600'
            }`}>
              {timeInfo.text}
            </p>
          </div>

          {/* Right: Headline + Notice text (expanded) */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-black dark:text-white leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {item.headline || `${item.protocolType || 'Nyhet'}`}
            </h3>
            {item.noticeText && (
              <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-[1.7] mt-1.5">
                {truncateWords(item.noticeText, 60)}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
})

// SSE Connection indicator - memoized
const LiveIndicator = React.memo(function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          connected
            ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]'
            : 'bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]'
        }`}
        aria-hidden="true"
      />
      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
        {connected ? 'LIVE' : 'OFFLINE'}
      </span>
      <span className="sr-only">
        {connected ? 'Ansluten till realtidsuppdateringar' : 'Frånkopplad från realtidsuppdateringar'}
      </span>
    </div>
  )
})

// Main Dashboard Page
export default function DashboardPage({ initialItems }: DashboardPageProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [filter, setFilter] = useState<'all' | 'bookmarks'>('all')
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sseConnected, setSseConnected] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [, forceUpdate] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const loaderRef = useRef<HTMLDivElement>(null)
  const offset = useRef(initialItems.length)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Online/offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Use notifications hook
  const notifications = useNotifications()

  // SSE message handler - memoized to prevent recreation
  const handleSSEMessage = useCallback((data: unknown) => {
    const message = data as {
      type?: string
      payload?: NewsItem
      oldId?: string
    }

    // Handle connection/heartbeat messages
    if (message.type === 'connected' || message.type === 'heartbeat') {
      return
    }

    // Handle INSERT - add new item to top
    if (message.type === 'INSERT' && message.payload) {
      setItems(prev => {
        // Avoid duplicates
        if (prev.some(item => item.id === message.payload!.id)) return prev
        return [message.payload!, ...prev]
      })

      // Show notification if enabled (with sound)
      if (message.payload.headline) {
        notifications.showNotificationWithSound(
          message.payload.companyName || 'Ny nyhet',
          message.payload.headline,
          `/news/${message.payload.id}`
        )
      }
    }

    // Handle UPDATE - update existing item
    if (message.type === 'UPDATE' && message.payload) {
      setItems(prev => prev.map(item =>
        item.id === message.payload!.id ? message.payload! : item
      ))
    }

    // Handle DELETE - remove item
    if (message.type === 'DELETE' && message.oldId) {
      setItems(prev => prev.filter(item => item.id !== message.oldId))
    }
  }, [notifications])

  // Use the SSE hook with proper cleanup - fixes memory leak and race condition
  const { status: sseStatus } = useSSE({
    url: '/api/news/stream',
    onMessage: handleSSEMessage,
    onOpen: useCallback(() => setSseConnected(true), []),
    onError: useCallback(() => setSseConnected(false), []),
    enabled: true,
  })

  // Sync SSE status
  useEffect(() => {
    setSseConnected(sseStatus === 'connected')
  }, [sseStatus])

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const res = await fetch(`/api/news?offset=${offset.current}&limit=10`)
      const data = await res.json()

      if (data.items && data.items.length > 0) {
        setItems(prev => [...prev, ...data.items])
        offset.current += data.items.length
        setHasMore(data.items.length === 10)
      } else {
        setHasMore(false)
      }
    } catch (e) {
      console.error('Error loading more:', e)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [loadMore, hasMore, loading])

  // Filter items - apply news-worthy filter + search + user filter (all/bookmarks)
  // Memoized to prevent recalculation on every render
  const newsWorthyItems = useMemo(() => items.filter(isNewsWorthy), [items])

  // Apply search filter - memoized
  const searchFilteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) return newsWorthyItems

    const query = debouncedSearch.toLowerCase()
    return newsWorthyItems.filter(item =>
      item.companyName?.toLowerCase().includes(query) ||
      item.orgNumber?.includes(query) ||
      item.headline?.toLowerCase().includes(query) ||
      item.noticeText?.toLowerCase().includes(query) ||
      item.protocolType?.toLowerCase().includes(query)
    )
  }, [newsWorthyItems, debouncedSearch])

  // Final filtered items - memoized
  const filteredItems = useMemo(() => {
    if (filter === 'bookmarks') {
      const bookmarks = getBookmarks()
      return searchFilteredItems.filter(item => bookmarks.has(item.id))
    }
    return searchFilteredItems
  }, [searchFilteredItems, filter])

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950 text-[#1A1A1A] dark:text-gray-100 pb-20">
      <DashboardHeader
        onOpenSettings={() => setShowSettingsModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            Du är offline — visar cachade nyheter
          </span>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <section>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <LiveIndicator connected={sseConnected} />
            <div className="flex gap-2" role="tablist" aria-label="Filtrera nyheter">
              <button
                onClick={() => setFilter('all')}
                role="tab"
                aria-selected={filter === 'all'}
                aria-controls="news-panel"
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg shadow-sm transition-all ${
                  filter === 'all'
                    ? 'border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-800 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                }`}
              >
                ALLA
              </button>
              <button
                onClick={() => { setFilter('bookmarks'); forceUpdate({}) }}
                role="tab"
                aria-selected={filter === 'bookmarks'}
                aria-controls="news-panel"
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === 'bookmarks'
                    ? 'border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-800 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                }`}
              >
                <Bookmark className="w-3 h-3" aria-hidden="true" />
                SPARADE
              </button>
            </div>
          </div>

          {/* Search results indicator */}
          {debouncedSearch && (
            <div className="mb-4 flex items-center gap-2" role="status" aria-live="polite">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredItems.length === 0 ? 'Inga resultat för' : `${filteredItems.length} träffar för`}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-black dark:text-white">
                &ldquo;{debouncedSearch}&rdquo;
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Rensa sökning"
              >
                Rensa
              </button>
            </div>
          )}

          <div id="news-panel" role="tabpanel" className="flex flex-col gap-5" aria-label="Nyhetsflöde">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400" role="status">
                {debouncedSearch ? (
                  <>
                    <Search className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <p className="text-sm">Inga nyheter hittades</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Prova ett annat sökord</p>
                  </>
                ) : filter === 'bookmarks' ? (
                  <>
                    <Bookmark className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <p className="text-sm">Inga sparade nyheter än</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Klicka på bokmärkesikonen för att spara</p>
                  </>
                ) : (
                  <p className="text-sm">Inga nyheter att visa</p>
                )}
              </div>
            ) : (
              (() => {
                // Group items by timeline period and render with markers
                let lastPeriod: TimelinePeriod | null = null
                const elements: React.ReactNode[] = []

                filteredItems.forEach((item, index) => {
                  const period = getTimelinePeriod(item.timestamp)
                  const isLastItem = index === filteredItems.length - 1

                  // Add period marker when period changes
                  if (period !== lastPeriod) {
                    elements.push(
                      <TimelineMarker
                        key={`marker-${period}-${index}`}
                        label={getTimelinePeriodLabel(period)}
                        isFirst={lastPeriod === null}
                      />
                    )
                    lastPeriod = period
                  }

                  // Add the news item wrapped in timeline
                  elements.push(
                    <TimelineItemWrapper
                      key={item.id}
                      isLast={isLastItem}
                    >
                      <NewsItemCard
                        item={item}
                        onBookmarkChange={() => forceUpdate({})}
                      />
                    </TimelineItemWrapper>
                  )
                })

                return elements
              })()
            )}
          </div>

          {/* Infinite scroll loader */}
          {filter === 'all' && hasMore && (
            <div ref={loaderRef} className="py-8 flex justify-center">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Laddar...</span>
                </div>
              ) : (
                <div className="w-8 h-8" /> // Invisible trigger element
              )}
            </div>
          )}

          {filter === 'all' && !hasMore && items.length > 0 && (
            <div className="py-8 text-center text-sm font-mono text-gray-400 dark:text-gray-500">
              — SLUT PÅ FLÖDET —
            </div>
          )}
            </section>
          </main>

          {/* Right Sidebar with Chat */}
          <GlobalSidebar>
          </GlobalSidebar>
        </div>
      </div>
    </div>
  )
}
