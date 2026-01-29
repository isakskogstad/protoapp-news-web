'use client'

import React from 'react'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, Settings,
  Activity, Bookmark, BookmarkCheck, Share2, Link2, Check, X
} from 'lucide-react'
import { NewsItem } from '@/lib/types'
import { getLogoUrl, formatOrgNumber, truncateWords } from '@/lib/utils'
import { createNewsNotificationMessage } from '@/lib/slack-blocks'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from './ThemeProvider'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useSSE } from '@/lib/hooks/useSSE'
// Using native img for profile images with error handling
import GlobalSidebar from './GlobalSidebar'
import FollowCompanies from './FollowCompanies'
import NotificationToggle from './NotificationToggle'

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

// Slack notification settings
type EventTypeFilter = 'konkurs' | 'nyemission' | 'styrelseforandring' | 'vdbyte' | 'rekonstruktion' | 'other'

interface FollowSettings {
  enabled: boolean
  mode: 'all' | 'selected'
  selectedCompanies: { org_number: string; company_name: string }[]
  slackWebhookUrl: string
  slackChannelId: string
  slackChannelName: string
  eventTypes: EventTypeFilter[]
}

function getFollowSettings(): FollowSettings | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('loopdesk_follow_settings')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

function detectEventType(item: NewsItem): EventTypeFilter {
  const headline = (item.headline || '').toLowerCase()
  const noticeText = (item.noticeText || '').toLowerCase()
  const protocolType = (item.protocolType || '').toLowerCase()
  const combined = `${headline} ${noticeText} ${protocolType}`

  if (combined.includes('konkurs')) return 'konkurs'
  if (combined.includes('nyemission') || combined.includes('emission')) return 'nyemission'
  if (combined.includes('styrelse')) return 'styrelseforandring'
  if (combined.includes('vd') && (combined.includes('byte') || combined.includes('ny ') || combined.includes('avgår'))) return 'vdbyte'
  if (combined.includes('rekonstruktion')) return 'rekonstruktion'
  return 'other'
}

function shouldNotifySlack(item: NewsItem): boolean {
  const settings = getFollowSettings()
  if (!settings || !settings.enabled) return false

  const eventType = detectEventType(item)
  const allowedTypes = settings.eventTypes || ['konkurs', 'nyemission', 'styrelseforandring', 'vdbyte', 'rekonstruktion', 'other']
  if (!allowedTypes.includes(eventType)) return false

  if (settings.mode === 'all') return true

  return settings.selectedCompanies.some(
    c => c.org_number === item.orgNumber || c.org_number.replace('-', '') === item.orgNumber?.replace('-', '')
  )
}

async function sendSlackNotification(item: NewsItem): Promise<void> {
  const settings = getFollowSettings()
  if (!settings?.slackChannelId && !settings?.slackWebhookUrl) return

  // Get the base URL for generating links
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Create rich Block Kit message using the utility function
  const message = createNewsNotificationMessage(item, baseUrl)

  try {
    if (settings.slackChannelId) {
      await fetch('/api/slack/send-to-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: settings.slackChannelId, message }),
      })
    } else if (settings.slackWebhookUrl) {
      await fetch('/api/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.slackWebhookUrl, message }),
      })
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error)
  }
}

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
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200/50 dark:border-[#30363d]">
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
              Följ bolag för att få notiser om nyheter.
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
    <header className="sticky top-0 z-40 w-full bg-white/98 dark:bg-[#0d1117]/98 backdrop-blur-md border-b border-gray-200/80 dark:border-[#30363d]" role="banner">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">

        {/* Left: Logo - Minimal text only */}
        <div className="flex items-center">
          <Link href="/" className="group" aria-label="Loop Desk - Gå till startsidan">
            <span className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white transition-colors group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff]">
              LOOP DESK
            </span>
          </Link>
        </div>

        {/* Center: Search - Desktop */}
        <div className="hidden md:block flex-1 max-w-md mx-8" role="search">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] dark:text-[#6e7681] group-focus-within:text-[#1e40af] dark:group-focus-within:text-[#58a6ff] transition-colors" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Sök bolag, person eller nyckelord..."
              aria-label="Sök i nyheter"
              className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl py-2.5 pl-11 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 dark:focus:ring-[#58a6ff]/20 focus:border-[#1e40af] dark:focus:border-[#58a6ff] transition-all placeholder:text-[#94a3b8] dark:placeholder:text-[#6e7681] text-[#0f172a] dark:text-[#e6edf3] shadow-sm"
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

        {/* Right: Mobile Search + Profile */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Sök"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Browser notification toggle */}
          <NotificationToggle />

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

// Format date as "29 jan -26" or "29 jan"
function formatShortDate(dateString?: string, includeYear = true): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    const day = date.getDate()
    const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    const month = months[date.getMonth()]
    if (includeYear) {
      const year = date.getFullYear().toString().slice(-2)
      return `${day} ${month} -${year}`
    }
    return `${day} ${month}`
  } catch {
    return null
  }
}

// Check if a date is in the future
function isDateInFuture(dateString?: string): boolean {
  if (!dateString) return false
  try {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  } catch {
    return false
  }
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

// Timeline marker component - shows period label (IDAG, IGÅR, etc.)
function TimelineMarker({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <div className={`flex items-center ${isFirst ? '' : 'mt-6 md:mt-8'}`}>
      {/* Time label - full width on mobile, fixed narrow width on desktop (pushed to left margin) */}
      <div className="md:w-14 shrink-0 md:flex md:justify-end md:pr-3">
        <span className="text-[10px] font-mono font-bold text-[#0f172a] dark:text-white uppercase tracking-[0.1em] bg-white dark:bg-[#161b22] px-2 py-1 rounded-md border border-gray-200 dark:border-[#30363d] shadow-sm">
          {label}
        </span>
      </div>
      {/* Marker dot on the line - hidden on mobile, visible on desktop */}
      <div className="hidden md:block w-3 h-3 rounded-full bg-[#1e40af] dark:bg-[#58a6ff] ring-2 ring-white dark:ring-[#0d1117] relative z-10 shadow-[0_0_8px_rgba(30,64,175,0.3)] dark:shadow-[0_0_8px_rgba(88,166,255,0.3)]" />
      {/* Horizontal line extending right - hidden on mobile */}
      <div className="hidden md:block flex-1 h-[1px] bg-gradient-to-r from-[#1e40af]/20 dark:from-[#58a6ff]/20 to-transparent ml-2" />
    </div>
  )
}

// Timeline item wrapper - wraps each news card with timeline dot and time label
function TimelineItemWrapper({
  children,
  timeText,
  isRecent = false,
  showDot = true
}: {
  children: React.ReactNode
  timeText?: string
  isRecent?: boolean
  isLast?: boolean
  showDot?: boolean
}) {
  return (
    <div className="flex group/timeline">
      {/* Timeline column with time label - hidden on mobile, fixed width on desktop */}
      <div className="hidden md:flex md:w-16 shrink-0 flex-col items-end pr-3 relative">
        {/* Time label - vertically centered relative to the card */}
        {timeText && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3">
            <span className={`text-[10px] font-mono whitespace-nowrap ${
              isRecent
                ? 'font-bold text-[#1e40af] dark:text-[#58a6ff]'
                : 'text-[#94a3b8] dark:text-[#6e7681]'
            }`}>
              {timeText}
            </span>
          </div>
        )}
      </div>

      {/* Dot on the timeline - hidden on mobile, animated on card hover on desktop */}
      <div className="hidden md:flex shrink-0 relative z-10 items-center" style={{ minHeight: '100%' }}>
        {showDot && (
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-[#30363d] border border-white dark:border-[#0d1117] transition-all duration-300 group-hover/timeline:bg-[#1e40af] dark:group-hover/timeline:bg-[#58a6ff] group-hover/timeline:scale-150" />
        )}
      </div>

      {/* Content - full width on mobile, with left padding on desktop */}
      <div className="flex-1 w-full md:pl-4">
        {children}
      </div>
    </div>
  )
}

// Timeline container - wraps the entire news list with a continuous vertical line
function TimelineContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Continuous vertical line - hidden on mobile, visible on desktop with gradient fade at bottom */}
      <div
        className="hidden md:block absolute left-[60px] top-0 bottom-0 w-[1px]"
        style={{
          background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent) 70%, transparent 100%)',
          opacity: 0.15
        }}
      />
      {/* News items - tighter gap on mobile, larger on desktop */}
      <div className="flex flex-col gap-4 md:gap-8">
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

  // Get time with recency info for visual hierarchy (used for mobile)
  const timeInfo = formatSmartTime(item.timestamp)

  // Format dates for display
  const registeredDateFormatted = formatShortDate(item.registeredDate)
  const eventDateFormatted = formatShortDate(item.eventDate)
  const isFutureEvent = item.isFutureEvent || isDateInFuture(item.eventDate)

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

  const [bookmarkAnimating, setBookmarkAnimating] = useState(false)

  const handleBookmarkWithAnimation = (e: React.MouseEvent) => {
    handleBookmark(e)
    setBookmarkAnimating(true)
    setTimeout(() => setBookmarkAnimating(false), 400)
  }

  return (
    <Link href={`/news/${item.id}`} className="block group">
      <article className="news-card relative rounded-2xl px-4 py-4 sm:px-7 sm:py-5">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-4 right-4 sm:left-6 sm:right-6 h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-[#30363d] to-transparent" />

        {/* Action buttons - horizontal on mobile (bottom), vertical on desktop (top-right) */}
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4 flex flex-row sm:flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-200 md:translate-x-2 md:group-hover:translate-x-0">
          <button
            onClick={handleBookmarkWithAnimation}
            className={`p-2 sm:p-2.5 rounded-lg transition-all touch-manipulation ripple-effect ${
              isBookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-sm'
                : 'text-gray-400 dark:text-[#6e7681] hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d]'
            } ${bookmarkAnimating ? 'bookmark-animate' : ''}`}
            aria-label={isBookmarked ? 'Ta bort bokmärke' : 'Spara som bokmärke'}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
          </button>

          <div className="relative">
            <button
              onClick={handleShare}
              className="p-2 sm:p-2.5 rounded-lg text-gray-400 dark:text-[#6e7681] hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all touch-manipulation ripple-effect"
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

        {/* Mobile: Stack vertically | Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 pr-16 sm:pr-12">
          {/* Company info section - horizontal on mobile, vertical column on desktop */}
          <div className="flex sm:flex-col items-start gap-3 sm:gap-0 sm:w-32 sm:shrink-0">
            {/* Registered date - top of left column (desktop only) */}
            {registeredDateFormatted && (
              <p className="hidden sm:block text-[9px] text-[#94a3b8] dark:text-[#6e7681] mb-2">
                <span className="font-medium">Registrerat:</span> {registeredDateFormatted}
              </p>
            )}

            {/* Logo */}
            <CompanyLogo
              orgNumber={item.orgNumber}
              companyName={item.companyName}
              logoUrl={item.logoUrl}
              size="md"
            />

            {/* Company details - inline on mobile, stacked on desktop */}
            <div className="flex-1 sm:flex-none min-w-0">
              {/* Company name */}
              <h4 className="text-xs sm:text-[11px] font-semibold text-[#334155] dark:text-[#8b949e] sm:mt-2.5 leading-tight line-clamp-1 sm:line-clamp-2">
                {item.companyName}
              </h4>

              {/* Org number + time on mobile */}
              <div className="flex items-center gap-2 sm:block">
                <p className="text-[10px] sm:text-[9px] font-mono text-[#94a3b8] dark:text-[#6e7681] sm:mt-1">
                  {formatOrgNumber(item.orgNumber)}
                </p>
                {/* Time - inline on mobile only */}
                <span className="sm:hidden text-[10px] font-mono text-[#94a3b8] dark:text-[#6e7681]">
                  · {timeInfo.text}
                </span>
              </div>
            </div>

            {/* Category badge */}
            <span className={`shrink-0 sm:mt-3 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-md ${categoryColor}`}>
              {formattedCategory}
            </span>

            {/* Event date (Stämmodatum) with color coding */}
            {eventDateFormatted && (
              <p className={`hidden sm:block mt-2 text-[9px] ${
                isFutureEvent
                  ? 'text-emerald-600 dark:text-emerald-400'  // Green for future events (kallelser)
                  : 'text-orange-600 dark:text-orange-400'    // Orange for past events (protokoll)
              }`}>
                <span className="font-medium">Stämmodatum:</span>{' '}
                <span className="font-semibold">{eventDateFormatted}</span>
              </p>
            )}
          </div>

          {/* News content - Headline + Notice text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#0f172a] dark:text-[#e6edf3] leading-snug group-hover:text-[#1e40af] dark:group-hover:text-[#58a6ff] transition-colors">
              {item.headline || `${item.protocolType || 'Nyhet'}`}
            </h3>
            {item.noticeText && (
              <p className="text-sm text-[#475569] dark:text-[#8b949e] leading-relaxed sm:leading-[1.85] mt-2 sm:mt-2.5 line-clamp-4 sm:line-clamp-none">
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
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] shadow-sm">
        <div
          className={`w-2 h-2 rounded-full ${
            connected
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
          }`}
          style={{ animation: connected ? 'pulse 2s ease-in-out infinite' : 'pulse 1s ease-in-out infinite' }}
          aria-hidden="true"
        />
        <span className="text-[10px] font-mono font-bold tracking-wider text-[#0f172a] dark:text-[#e6edf3]">
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
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

      // Show browser notification if enabled (with sound)
      if (message.payload.headline) {
        notifications.showNotificationWithSound(
          message.payload.companyName || 'Ny nyhet',
          message.payload.headline,
          `/news/${message.payload.id}`
        )
      }

      // Send Slack notification if enabled
      if (shouldNotifySlack(message.payload)) {
        sendSlackNotification(message.payload)
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0d1117] text-[#0f172a] dark:text-[#e6edf3] pb-32">
      <DashboardHeader
        onOpenSettings={() => setShowSettingsModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Masthead line under header */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-300 dark:via-[#30363d] to-transparent" />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-center text-sm font-medium">
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          {/* Main Content */}
          <main className="flex-1 min-w-0 order-1">
            <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-10 pb-4 sm:pb-6 border-b border-gray-200/60 dark:border-[#30363d]">
            <LiveIndicator connected={sseConnected} />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <FollowCompanies />
              <div className="flex gap-2 flex-1 sm:flex-none" role="tablist" aria-label="Filtrera nyheter">
              <button
                onClick={() => setFilter('all')}
                role="tab"
                aria-selected={filter === 'all'}
                aria-controls="news-panel"
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs font-mono font-semibold rounded-lg transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] shadow-md'
                    : 'border border-gray-200 dark:border-[#30363d] text-[#64748b] dark:text-[#8b949e] bg-white dark:bg-[#161b22] hover:border-[#0f172a] dark:hover:border-white hover:text-[#0f172a] dark:hover:text-white'
                }`}
              >
                ALLA
              </button>
              <button
                onClick={() => { setFilter('bookmarks'); forceUpdate({}) }}
                role="tab"
                aria-selected={filter === 'bookmarks'}
                aria-controls="news-panel"
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs font-mono font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  filter === 'bookmarks'
                    ? 'bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] shadow-md'
                    : 'border border-gray-200 dark:border-[#30363d] text-[#64748b] dark:text-[#8b949e] bg-white dark:bg-[#161b22] hover:border-[#0f172a] dark:hover:border-white hover:text-[#0f172a] dark:hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                SPARADE
              </button>
              </div>
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

          <div id="news-panel" role="tabpanel" aria-label="Nyhetsflöde">
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
              <TimelineContainer>
                {(() => {
                  // Group items by timeline period and render with markers
                  let lastPeriod: TimelinePeriod | null = null
                  const elements: React.ReactNode[] = []

                  filteredItems.forEach((item, index) => {
                    const period = getTimelinePeriod(item.timestamp)
                    const isLastItem = index === filteredItems.length - 1
                    const timeInfo = formatSmartTime(item.timestamp)

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

                    // Add the news item wrapped in timeline with time label
                    elements.push(
                      <TimelineItemWrapper
                        key={item.id}
                        isLast={isLastItem}
                        timeText={timeInfo.text}
                        isRecent={timeInfo.isRecent}
                      >
                        <NewsItemCard
                          item={item}
                          onBookmarkChange={() => forceUpdate({})}
                        />
                      </TimelineItemWrapper>
                    )
                  })

                  return elements
                })()}
              </TimelineContainer>
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

          {/* Right Sidebar with Chat - hidden on mobile/tablet */}
          <div className="hidden lg:block order-2">
            <GlobalSidebar>
            </GlobalSidebar>
          </div>
        </div>
      </div>
    </div>
  )
}
