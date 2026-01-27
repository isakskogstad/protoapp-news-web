'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell, Search, Settings, Calendar, Eye,
  Clock, ArrowUpRight, Globe, FileText, Activity,
  Bookmark, BookmarkCheck, Share2, Link2, Check, X
} from 'lucide-react'
import { NewsItem } from '@/lib/types'
import { formatRelativeTime, getLogoUrl } from '@/lib/utils'
import { useSession, signOut } from 'next-auth/react'
// Using native img for profile images with error handling
import SidebarWidget from './SidebarWidget'
import UpcomingEvents, { UpcomingEvent } from './UpcomingEvents'
import WatchList, { WatchedCompany } from './WatchList'
import GlobalSidebar from './GlobalSidebar'

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

// Push notification utilities
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

function showNotification(title: string, body: string, url?: string) {
  if (Notification.permission !== 'granted') return
  const notification = new Notification(title, {
    body,
    icon: '/team/Isak.png',
    badge: '/team/Isak.png',
  })
  if (url) {
    notification.onclick = () => {
      window.focus()
      window.location.href = url
    }
  }
}

// Settings Modal
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('loopdesk_theme') as 'light' | 'dark' | 'system' | null
    if (saved) setTheme(saved)
  }, [])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('loopdesk_theme', newTheme)
    // Apply theme (for now just light mode)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Inställningar</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Tema</label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`px-4 py-2.5 text-sm rounded-lg border transition-all ${
                    theme === t
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'light' ? 'Ljust' : t === 'dark' ? 'Mörkt' : 'System'}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notiser</label>
            <p className="text-sm text-gray-500">
              Hantera notiser via klocksymbolen i headern.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
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
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 min-w-[240px]">
        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-100">
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
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{userName}</div>
              <div className="text-xs text-gray-500 truncate">{userEmail}</div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1">
          <button
            onClick={() => { onOpenSettings(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-400" />
            Inställningar
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-100 pt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
function DashboardHeader({ onNotificationToggle, notificationsEnabled, onOpenSettings }: {
  onNotificationToggle: () => void
  notificationsEnabled: boolean
  onOpenSettings: () => void
}) {
  const { data: session } = useSession()
  const userName = session?.user?.name || 'Användare'
  const userImage = session?.user?.image
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Left: Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-bold text-lg transition-transform group-hover:scale-105">
              L
            </div>
            <span className="text-xl tracking-tight text-black">
              LOOP<span className="text-gray-400">DESK</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-sm font-mono text-gray-500">
            <span className="text-gray-300">/</span>
            <span className="text-black font-medium">ÖVERSIKT</span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Sök bolag, person eller nyckelord..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-gray-400 text-black"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
              <span className="text-[10px] font-mono text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </div>
        </div>

        {/* Right: Profile & Notifications */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNotificationToggle}
            className={`p-2 rounded-md transition-colors relative ${
              notificationsEnabled
                ? 'bg-black text-white hover:bg-gray-800'
                : 'hover:bg-gray-100 text-gray-500 hover:text-black'
            }`}
            title={notificationsEnabled ? 'Notiser på' : 'Aktivera notiser'}
          >
            <Bell className="w-5 h-5" />
            {notificationsEnabled && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-black hidden sm:block"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-gray-50 rounded-full transition-all border border-transparent hover:border-gray-200 group"
            >
              <div className="text-right hidden sm:block group-hover:opacity-80">
                <div className="text-xs font-bold leading-none text-black">{userName.split(' ')[0]}</div>
                <div className="text-[10px] font-mono text-gray-500 leading-none mt-0.5">REDAKTÖR</div>
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
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">
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

// Company Logo Component with caching
function CompanyLogo({ orgNumber, companyName, logoUrl, size = 'md' }: {
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

  if (!url || error) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-medium text-xs border border-gray-200`}>
        {initials}
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-white border border-gray-200 overflow-hidden relative`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 skeleton-shimmer" />
      )}
      {displayUrl && (
        <img
          src={displayUrl}
          alt=""
          crossOrigin="anonymous"
          className={`w-full h-full object-contain p-1.5 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleLoad}
          onError={() => { setError(true); setLoading(false) }}
        />
      )}
    </div>
  )
}

// Share Menu Component
function ShareMenu({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[180px]">
      <button
        onClick={copyLink}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
        {copied ? 'Kopierad!' : 'Kopiera länk'}
      </button>
      <button
        onClick={() => {
          window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`, '_blank')
          onClose()
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        E-posta
      </button>
    </div>
  )
}

// Smart time formatting
function formatSmartTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    // Under 1 hour: "X min"
    if (diffMins < 60) {
      return `${Math.max(1, diffMins)} min`
    }

    // Same day (and within last 24h): show time "HH:MM"
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `I går ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`
    }

    // Same week: weekday + time
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays < 7) {
      const weekday = date.toLocaleDateString('sv-SE', { weekday: 'short' })
      return `${weekday} ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`
    }

    // Older: date
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  } catch {
    return dateString
  }
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

// News Item Component - Compact horizontal layout
interface NewsItemCardProps {
  item: NewsItem
  onBookmarkChange?: () => void
}

function NewsItemCard({ item, onBookmarkChange }: NewsItemCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    setIsBookmarked(getBookmarks().has(item.id))
  }, [item.id])

  const category = getCategory(item)
  const categoryColors: Record<string, string> = {
    'Nyemission': 'text-emerald-600',
    'Konkurs': 'text-red-600',
    'Kallelse till stämma': 'text-blue-600',
    'Årsstämma': 'text-blue-600',
    'Extra bolagsstämma': 'text-blue-600',
    'Styrelsemöte': 'text-purple-600',
    'Styrelseändring': 'text-purple-600',
    'VD-byte': 'text-orange-600',
  }
  const categoryColor = categoryColors[category] || 'text-gray-500'
  const newsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/news/${item.id}`

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
      <article className="relative bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150 py-4">
        <div className="flex gap-4">
          {/* Left column: Logo + Company info (fixed width) */}
          <div className="w-44 shrink-0 flex items-start gap-3">
            <CompanyLogo
              orgNumber={item.orgNumber}
              companyName={item.companyName}
              logoUrl={item.logoUrl}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-black truncate leading-tight">
                {item.companyName}
              </h4>
              <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                {item.orgNumber}
              </p>
            </div>
          </div>

          {/* Middle: Headline + Notice text (flexible) */}
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-sm font-bold text-black leading-snug group-hover:text-blue-700 transition-colors line-clamp-1">
              {item.headline || `${item.protocolType || 'Nyhet'}`}
            </h3>
            {item.noticeText && (
              <p className="text-xs text-gray-500 leading-relaxed mt-1 line-clamp-2">
                {item.noticeText}
              </p>
            )}
          </div>

          {/* Right column: Time + Category (fixed width) */}
          <div className="w-28 shrink-0 text-right flex flex-col items-end">
            <span className="text-xs font-mono text-gray-400">
              {formatSmartTime(item.timestamp)}
            </span>
            <span className={`text-[10px] font-medium mt-1 ${categoryColor}`}>
              {category}
            </span>

            {/* Action buttons */}
            <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleBookmark}
                className={`p-1 rounded transition-all ${
                  isBookmarked
                    ? 'text-yellow-600'
                    : 'text-gray-300 hover:text-gray-500'
                }`}
                title={isBookmarked ? 'Ta bort bokmärke' : 'Spara'}
              >
                {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleShare}
                className="p-1 rounded text-gray-300 hover:text-gray-500 transition-all relative"
                title="Dela"
              >
                <Share2 className="w-3.5 h-3.5" />
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
        </div>
      </article>
    </Link>
  )
}

// SSE Connection indicator
function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${
        connected
          ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]'
          : 'bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]'
      }`} />
      <span className="text-xs font-mono text-gray-500">
        {connected ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  )
}

// Main Dashboard Page
export default function DashboardPage({ initialItems }: DashboardPageProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems)
  const [filter, setFilter] = useState<'all' | 'bookmarks'>('all')
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sseConnected, setSseConnected] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [, forceUpdate] = useState({})
  const loaderRef = useRef<HTMLDivElement>(null)
  const offset = useRef(initialItems.length)

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  // Toggle notifications
  const handleNotificationToggle = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
    } else {
      const granted = await requestNotificationPermission()
      setNotificationsEnabled(granted)
      if (granted) {
        showNotification('Notiser aktiverade', 'Du får nu notiser om nya nyheter')
      }
    }
  }

  // SSE Connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/news/stream')

    eventSource.onopen = () => {
      setSseConnected(true)
    }

    eventSource.onerror = () => {
      setSseConnected(false)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'INSERT' && data.payload) {
          // Add new item to top
          setItems(prev => {
            // Avoid duplicates
            if (prev.some(item => item.id === data.payload.id)) return prev
            return [data.payload, ...prev]
          })

          // Show notification if enabled
          if (notificationsEnabled && data.payload.headline) {
            showNotification(
              data.payload.companyName || 'Ny nyhet',
              data.payload.headline,
              `/news/${data.payload.id}`
            )
          }
        }
      } catch (e) {
        // Ignore parse errors (heartbeats etc)
      }
    }

    return () => eventSource.close()
  }, [notificationsEnabled])

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

  // Filter items
  const filteredItems = filter === 'bookmarks'
    ? items.filter(item => getBookmarks().has(item.id))
    : items

  // Extract upcoming events from news items (kallelser)
  const upcomingEvents: UpcomingEvent[] = items
    .filter(item => {
      const headline = item.headline?.toLowerCase() || ''
      return headline.includes('kallelse') || headline.includes('stämma') || headline.includes('årsstämma')
    })
    .map(item => ({
      id: item.id,
      title: item.protocolType || 'Bolagsstämma',
      company: item.companyName,
      date: item.kallelseFaktaruta?.datum || item.timestamp,
      location: item.kallelseFaktaruta?.plats,
      type: 'stamma' as const
    }))
    .slice(0, 10)

  // Sample watched companies (will be populated from localStorage in WatchList)
  const sampleWatchedCompanies: WatchedCompany[] = []

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] pb-20">
      <DashboardHeader
        onNotificationToggle={handleNotificationToggle}
        notificationsEnabled={notificationsEnabled}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <section>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <LiveIndicator connected={sseConnected} />
              Live Feed
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg shadow-sm transition-all ${
                  filter === 'all'
                    ? 'border border-black bg-black text-white'
                    : 'border border-gray-200 text-gray-500 bg-white hover:border-black hover:text-black'
                }`}
              >
                ALLA
              </button>
              <button
                onClick={() => { setFilter('bookmarks'); forceUpdate({}) }}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === 'bookmarks'
                    ? 'border border-black bg-black text-white'
                    : 'border border-gray-200 text-gray-500 bg-white hover:border-black hover:text-black'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                SPARADE
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                {filter === 'bookmarks' ? (
                  <>
                    <Bookmark className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Inga sparade nyheter än</p>
                    <p className="text-xs text-gray-400 mt-1">Klicka på bokmärkesikonen för att spara</p>
                  </>
                ) : (
                  <p className="text-sm">Inga nyheter att visa</p>
                )}
              </div>
            ) : (
              filteredItems.map((item) => (
                <NewsItemCard
                  key={item.id}
                  item={item}
                  onBookmarkChange={() => forceUpdate({})}
                />
              ))
            )}
          </div>

          {/* Infinite scroll loader */}
          {filter === 'all' && hasMore && (
            <div ref={loaderRef} className="py-8 flex justify-center">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Laddar...</span>
                </div>
              ) : (
                <div className="w-8 h-8" /> // Invisible trigger element
              )}
            </div>
          )}

          {filter === 'all' && !hasMore && items.length > 0 && (
            <div className="py-8 text-center text-sm font-mono text-gray-400">
              — SLUT PÅ FLÖDET —
            </div>
          )}
            </section>
          </main>

          {/* Right Sidebar with Chat */}
          <GlobalSidebar>
            {/* Upcoming Events */}
            <SidebarWidget
              title="Kommande händelser"
              icon={<Calendar className="w-4 h-4" />}
              actionLabel="Kalender"
            >
              <UpcomingEvents events={upcomingEvents} maxItems={5} />
            </SidebarWidget>

            {/* Watchlist */}
            <SidebarWidget
              title="Bevakningslista"
              icon={<Eye className="w-4 h-4" />}
              actionLabel="Alla"
            >
              <WatchList companies={sampleWatchedCompanies} />
            </SidebarWidget>

            {/* Quick Stats */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-black">{items.length}</div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Nyheter</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-black">{upcomingEvents.length}</div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Händelser</div>
                </div>
              </div>
            </div>
          </GlobalSidebar>
        </div>
      </div>
    </div>
  )
}
