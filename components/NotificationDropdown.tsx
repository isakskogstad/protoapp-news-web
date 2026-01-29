'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, Search, Check, Building2, Loader2 } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { formatOrgNumber } from '@/lib/utils'

// Storage keys
const NOTIFICATION_MODE_KEY = 'loopdesk_notification_mode'
const WATCHED_COMPANIES_KEY = 'loopdesk_watched_companies'

interface WatchedCompany {
  id: string
  name: string
  orgNumber: string
}

type NotificationMode = 'all' | 'selected'

function getNotificationMode(): NotificationMode {
  if (typeof window === 'undefined') return 'all'
  return (localStorage.getItem(NOTIFICATION_MODE_KEY) as NotificationMode) || 'all'
}

function setNotificationMode(mode: NotificationMode): void {
  localStorage.setItem(NOTIFICATION_MODE_KEY, mode)
}

function getWatchedCompanies(): WatchedCompany[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(WATCHED_COMPANIES_KEY)
  return stored ? JSON.parse(stored) : []
}

function saveWatchedCompanies(companies: WatchedCompany[]): void {
  localStorage.setItem(WATCHED_COMPANIES_KEY, JSON.stringify(companies))
}

export default function NotificationDropdown() {
  const notifications = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<NotificationMode>('all')
  const [watchedCompanies, setWatchedCompanies] = useState<WatchedCompany[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WatchedCompany[]>([])
  const [searching, setSearching] = useState(false)
  const [allCompanies, setAllCompanies] = useState<WatchedCompany[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load settings on mount
  useEffect(() => {
    setMode(getNotificationMode())
    setWatchedCompanies(getWatchedCompanies())
  }, [])

  // Load all companies when dropdown opens
  useEffect(() => {
    if (isOpen && allCompanies.length === 0) {
      loadAllCompanies()
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const loadAllCompanies = async () => {
    setLoadingCompanies(true)
    try {
      const res = await fetch('/api/companies?limit=2000')
      const data = await res.json()
      setAllCompanies(data.companies || [])
    } catch (e) {
      console.error('Failed to load companies:', e)
    } finally {
      setLoadingCompanies(false)
    }
  }

  // Debounced search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(() => {
      const q = query.toLowerCase()
      const results = allCompanies.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.orgNumber.includes(q)
      ).slice(0, 50)
      setSearchResults(results)
      setSearching(false)
    }, 150)
  }, [allCompanies])

  const handleModeChange = (newMode: NotificationMode) => {
    setMode(newMode)
    setNotificationMode(newMode)
  }

  const toggleCompany = (company: WatchedCompany) => {
    const exists = watchedCompanies.find(c => c.id === company.id)
    let updated: WatchedCompany[]

    if (exists) {
      updated = watchedCompanies.filter(c => c.id !== company.id)
    } else {
      updated = [...watchedCompanies, company]
    }

    setWatchedCompanies(updated)
    saveWatchedCompanies(updated)
  }

  const isCompanyWatched = (id: string) => watchedCompanies.some(c => c.id === id)

  // Detect Safari browser
  const isSafari = typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // Check if notifications are actually working
  const notificationsWorking = typeof Notification !== 'undefined' && Notification.permission === 'granted'

  const handleToggleClick = async () => {
    // Always allow opening the dropdown to configure preferences
    if (isOpen) {
      setIsOpen(false)
      return
    }

    // If notifications already work, just open
    if (notificationsWorking) {
      localStorage.setItem('loopdesk_notifications_enabled', 'true')
      setIsOpen(true)
      return
    }

    // Try to request permission (may fail in Safari)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          localStorage.setItem('loopdesk_notifications_enabled', 'true')
          new Notification('LoopDesk', {
            body: 'Notiser aktiverade!',
            icon: '/icon-192.png',
          })
        }
      } catch (e) {
        console.log('Permission request failed:', e)
      }
    }

    // Open dropdown regardless - let user configure preferences
    // They'll work when/if browser permission is granted
    setIsOpen(true)
  }

  // Display list: search results or watched companies
  const displayList = searchQuery.trim() ? searchResults : watchedCompanies

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggleClick}
        disabled={notifications.loading}
        className={`p-2 rounded-md transition-colors relative ${
          notificationsWorking
            ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
        }`}
        title="Hantera notiser"
      >
        {notifications.loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {notificationsWorking && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-gray-900" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-black dark:text-white">Notiser</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning banner if notifications not working */}
          {!notificationsWorking && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {isSafari ? (
                  <>⚠️ Safari: Använd Chrome för notiser, eller lägg till appen i Dock (Arkiv → Lägg till i Dock)</>
                ) : (
                  <>⚠️ Notiser ej aktiverade. Klicka på hänglåset i adressfältet för att tillåta.</>
                )}
              </p>
            </div>
          )}

          {/* Mode selector */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('all')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                  mode === 'all'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Alla händelser
              </button>
              <button
                onClick={() => handleModeChange('selected')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
                  mode === 'selected'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Valda bolag ({watchedCompanies.length})
              </button>
            </div>
          </div>

          {/* Company selector (only in selected mode) */}
          {mode === 'selected' && (
            <>
              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Sök bland 1215 bolag..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-9 pr-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Company list */}
              <div className="max-h-64 overflow-y-auto">
                {loadingCompanies ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-5 h-5 mx-auto text-gray-400 animate-spin" />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Laddar bolag...</p>
                  </div>
                ) : displayList.length === 0 ? (
                  <div className="py-8 text-center">
                    <Building2 className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {searchQuery.trim() ? 'Inga bolag hittades' : 'Sök för att lägga till bolag'}
                    </p>
                  </div>
                ) : (
                  displayList.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => toggleCompany(company)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium text-black dark:text-white truncate">
                          {company.name}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                          {formatOrgNumber(company.orgNumber)}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        isCompanyWatched(company.id)
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'border border-gray-300 dark:border-gray-600'
                      }`}>
                        {isCompanyWatched(company.id) && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer with count */}
              {watchedCompanies.length > 0 && !searchQuery.trim() && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                    {watchedCompanies.length} bolag bevakade
                  </p>
                </div>
              )}
            </>
          )}

          {/* All mode info */}
          {mode === 'all' && (
            <div className="px-4 py-6 text-center">
              <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Du får notiser för alla händelser
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Byt till "Valda bolag" för att filtrera
              </p>
            </div>
          )}

          {/* Test + Disable buttons */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <button
              onClick={async () => {
                // Test notification
                if (Notification.permission === 'granted') {
                  new Notification('Testnotis från LoopDesk', {
                    body: 'Notiser fungerar! Du kommer få notiser om nya händelser.',
                    icon: '/icon-192.png',
                  })
                } else {
                  alert('Notisbehörighet saknas. Klicka på klockan för att aktivera.')
                }
              }}
              className="w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              Skicka testnotis
            </button>
            <button
              onClick={async () => {
                await notifications.disable()
                setIsOpen(false)
              }}
              className="w-full py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Stäng av notiser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
