'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Company {
  org_number: string
  company_name: string
}

interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
}

// Event types that can be filtered
export type EventTypeFilter = 'konkurs' | 'nyemission' | 'styrelseforandring' | 'vdbyte' | 'rekonstruktion' | 'other'

export const EVENT_TYPE_CONFIG: Record<EventTypeFilter, { label: string; emoji: string; color: string }> = {
  konkurs: { label: 'Konkurs', emoji: '🔴', color: '#dc3545' },
  nyemission: { label: 'Nyemission', emoji: '💰', color: '#28a745' },
  styrelseforandring: { label: 'Styrelseförändring', emoji: '👥', color: '#6f42c1' },
  vdbyte: { label: 'VD-byte', emoji: '👔', color: '#fd7e14' },
  rekonstruktion: { label: 'Rekonstruktion', emoji: '⚠️', color: '#ffc107' },
  other: { label: 'Övrigt', emoji: '📄', color: '#6c757d' },
}

export interface FollowSettings {
  enabled: boolean
  mode: 'all' | 'selected'
  selectedCompanies: Company[]
  slackWebhookUrl: string // Legacy - kept for backwards compatibility
  slackChannelId: string
  slackChannelName: string
  eventTypes: EventTypeFilter[]
  compactView: boolean
}

const DEFAULT_SETTINGS: FollowSettings = {
  enabled: false,
  mode: 'all',
  selectedCompanies: [],
  slackWebhookUrl: '',
  slackChannelId: '',
  slackChannelName: '',
  eventTypes: ['konkurs', 'nyemission', 'styrelseforandring', 'vdbyte', 'rekonstruktion', 'other'],
  compactView: false,
}

export default function FollowCompanies() {
  const { data: session } = useSession()
  const [isExpanded, setIsExpanded] = useState(false)
  const [settings, setSettings] = useState<FollowSettings>(DEFAULT_SETTINGS)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Company[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [isLoadingChannels, setIsLoadingChannels] = useState(false)
  const [channelsError, setChannelsError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const channelsFetched = useRef(false)

  // Load settings from localStorage (with migration for new fields)
  useEffect(() => {
    const stored = localStorage.getItem('loopdesk_follow_settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Merge with defaults to handle missing fields from older versions
        const migrated: FollowSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Ensure eventTypes is always an array
          eventTypes: parsed.eventTypes || DEFAULT_SETTINGS.eventTypes,
          // Ensure channel fields exist
          slackChannelId: parsed.slackChannelId || '',
          slackChannelName: parsed.slackChannelName || '',
        }
        setSettings(migrated)
        // Save migrated settings back if fields were missing
        if (!parsed.eventTypes || parsed.compactView === undefined || !parsed.slackChannelId) {
          localStorage.setItem('loopdesk_follow_settings', JSON.stringify(migrated))
        }
      } catch (e) {
        console.error('Failed to parse follow settings:', e)
      }
    }
  }, [])

  // Fetch Slack channels when panel is expanded and user is authenticated
  const fetchChannels = useCallback(async () => {
    if (!session?.user || channelsFetched.current) return

    setIsLoadingChannels(true)
    setChannelsError(null)

    try {
      const response = await fetch('/api/slack/user-channels')
      const data = await response.json()

      if (!response.ok) {
        setChannelsError(data.error || 'Failed to fetch channels')
        return
      }

      setChannels(data.channels || [])
      channelsFetched.current = true
    } catch (error) {
      console.error('Error fetching channels:', error)
      setChannelsError('Failed to fetch channels')
    } finally {
      setIsLoadingChannels(false)
    }
  }, [session])

  // Fetch channels when expanded
  useEffect(() => {
    if (isExpanded && session?.user && !channelsFetched.current) {
      fetchChannels()
    }
  }, [isExpanded, session, fetchChannels])

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: FollowSettings) => {
    setSettings(newSettings)
    localStorage.setItem('loopdesk_follow_settings', JSON.stringify(newSettings))
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent('loopdesk-settings-changed'))
  }, [])

  // Search companies
  const searchCompanies = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(query)}&limit=10`)
      const data = await res.json()
      setSearchResults(data.companies || [])
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchCompanies(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchCompanies])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleEnabled = () => {
    saveSettings({ ...settings, enabled: !settings.enabled })
  }

  const setMode = (mode: 'all' | 'selected') => {
    saveSettings({ ...settings, mode })
  }

  const addCompany = (company: Company) => {
    if (!settings.selectedCompanies.some(c => c.org_number === company.org_number)) {
      saveSettings({
        ...settings,
        selectedCompanies: [...settings.selectedCompanies, company],
      })
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const removeCompany = (orgNumber: string) => {
    saveSettings({
      ...settings,
      selectedCompanies: settings.selectedCompanies.filter(c => c.org_number !== orgNumber),
    })
  }

  const updateWebhookUrl = (url: string) => {
    saveSettings({ ...settings, slackWebhookUrl: url })
    setTestResult(null) // Reset test result when URL changes
  }

  const selectChannel = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId)
    saveSettings({
      ...settings,
      slackChannelId: channelId,
      slackChannelName: channel?.name || '',
    })
    setTestResult(null)
  }

  const toggleEventType = (eventType: EventTypeFilter) => {
    const current = settings.eventTypes || []
    const newTypes = current.includes(eventType)
      ? current.filter(t => t !== eventType)
      : [...current, eventType]
    saveSettings({ ...settings, eventTypes: newTypes })
  }

  const toggleCompactView = () => {
    saveSettings({ ...settings, compactView: !settings.compactView })
  }

  const testSlackConnection = async () => {
    // Prefer channel-based API, fall back to webhook
    const useChannelApi = !!settings.slackChannelId
    const useWebhook = !useChannelApi && !!settings.slackWebhookUrl

    if (!useChannelApi && !useWebhook) return

    setIsTesting(true)
    setTestResult(null)

    try {
      let response: Response

      if (useChannelApi) {
        response = await fetch('/api/slack/send-to-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: settings.slackChannelId,
            message: {
              text: 'Testmeddelande från LoopDesk',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: ':white_check_mark: *Testmeddelande från LoopDesk*\n\nDin Slack-integration fungerar! Du kommer nu få notiser om bolagshändelser här.',
                  },
                },
              ],
            },
          }),
        })
      } else {
        response = await fetch('/api/slack/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: settings.slackWebhookUrl,
            message: {
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: ':white_check_mark: *Testmeddelande från LoopDesk*\n\nDin Slack-integration fungerar! Du kommer nu få notiser om bolagshändelser här.',
                  },
                },
              ],
            },
          }),
        })
      }

      if (response.ok) {
        setTestResult('success')
      } else {
        setTestResult('error')
      }
    } catch {
      setTestResult('error')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300
          ${settings.enabled
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Följ bolag
        {settings.enabled && (
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </button>

      {/* Expanded panel */}
      <div
        className={`
          absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-out origin-top-right z-50
          ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Få notiser om bolagshändelser direkt i Slack.
              </p>
            </div>

            {/* Toggle */}
            <button
              onClick={toggleEnabled}
              className={`
                relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0
                ${settings.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300
                  ${settings.enabled ? 'translate-x-7' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Mode selection */}
          {settings.enabled && (
            <div className="animate-fade-in">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setMode('all')}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${settings.mode === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
                  `}
                >
                  Alla
                </button>
                <button
                  onClick={() => setMode('selected')}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${settings.mode === 'selected'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
                  `}
                >
                  Vissa
                </button>
              </div>

              {/* Slack channel selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Slack-kanal
                </label>

                {session?.user ? (
                  <>
                    <div className="flex gap-2">
                      {isLoadingChannels ? (
                        <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-400 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                          Laddar kanaler...
                        </div>
                      ) : channelsError ? (
                        <div className="flex-1">
                          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                            {channelsError}
                          </div>
                          <button
                            onClick={() => {
                              channelsFetched.current = false
                              fetchChannels()
                            }}
                            className="mt-1 text-xs text-blue-500 hover:underline"
                          >
                            Försök igen
                          </button>
                        </div>
                      ) : (
                        <select
                          value={settings.slackChannelId}
                          onChange={(e) => selectChannel(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                          <option value="">Välj kanal...</option>
                          {channels.map(channel => (
                            <option key={channel.id} value={channel.id}>
                              {channel.isPrivate ? '🔒 ' : '#'}{channel.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={testSlackConnection}
                        disabled={!settings.slackChannelId || isTesting}
                        className={`
                          px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                          ${testResult === 'success'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : testResult === 'error'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {isTesting ? (
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        ) : testResult === 'success' ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : testResult === 'error' ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          'Testa'
                        )}
                      </button>
                    </div>

                    {testResult === 'error' && (
                      <p className="mt-1 text-xs text-red-500">Kunde inte skicka till Slack. Kontrollera att du har tillgång till kanalen.</p>
                    )}

                    {settings.slackChannelId && (
                      <p className="mt-1.5 text-[10px] text-gray-400">
                        Notiser skickas till #{settings.slackChannelName}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
                    Logga in för att välja Slack-kanal
                  </div>
                )}
              </div>

              {/* Event type filters */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Händelsetyper att bevaka
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(EVENT_TYPE_CONFIG) as EventTypeFilter[]).map(type => {
                    const config = EVENT_TYPE_CONFIG[type]
                    const isSelected = (settings.eventTypes || []).includes(type)
                    return (
                      <button
                        key={type}
                        onClick={() => toggleEventType(type)}
                        className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
                          ${isSelected
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-50'}
                        `}
                        style={isSelected ? { backgroundColor: config.color } : undefined}
                      >
                        <span>{config.emoji}</span>
                        <span>{config.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-gray-400">
                  Klicka för att aktivera/inaktivera händelsetyper.
                </p>
              </div>

              {/* Compact view toggle */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Kompakt vy
                  </label>
                  <p className="text-[10px] text-gray-400">
                    Visa fler nyheter per skärm
                  </p>
                </div>
                <button
                  onClick={toggleCompactView}
                  className={`
                    relative w-10 h-5 rounded-full transition-colors duration-300 flex-shrink-0
                    ${settings.compactView ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                >
                  <span
                    className={`
                      absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300
                      ${settings.compactView ? 'translate-x-5' : 'translate-x-0.5'}
                    `}
                  />
                </button>
              </div>

              {/* Company search (only when mode is 'selected') */}
              {settings.mode === 'selected' && (
                <div className="animate-fade-in">
                  {/* Selected companies */}
                  {settings.selectedCompanies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {settings.selectedCompanies.map(company => (
                        <span
                          key={company.org_number}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs"
                        >
                          {company.company_name}
                          <button
                            onClick={() => removeCompany(company.org_number)}
                            className="hover:text-blue-900 dark:hover:text-blue-100"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Sök bolag..."
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      {searchResults.map(company => (
                        <button
                          key={company.org_number}
                          onClick={() => addCompany(company)}
                          disabled={settings.selectedCompanies.some(c => c.org_number === company.org_number)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">{company.company_name}</span>
                          <span className="ml-2 text-xs text-gray-400 font-mono">{company.org_number}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <p className="mt-2 text-xs text-gray-400 text-center">Inga bolag hittades</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
