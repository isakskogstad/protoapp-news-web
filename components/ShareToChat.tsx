'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { buildNewsBlocks } from '@/lib/slack-blocks'
import { Clock, ChevronDown, X } from 'lucide-react'

interface ShareToChatProps {
  companyName: string
  headline?: string
  newsId: string
  orgNumber?: string
  protocolType?: string
  protocolDate?: string
  noticeText?: string
  logoUrl?: string
  newsValue?: number
  className?: string
}

export default function ShareToChat({
  companyName,
  headline,
  newsId,
  orgNumber,
  protocolType,
  protocolDate,
  noticeText,
  logoUrl,
  newsValue,
  className = ''
}: ShareToChatProps) {
  const { data: session } = useSession()
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduled, setScheduled] = useState(false)

  if (!session) return null

  const handleShare = async (isScheduled = false) => {
    if (sharing || shared) return

    // Validate scheduled time
    if (isScheduled && (!scheduleDate || !scheduleTime)) {
      setError('Välj datum och tid')
      setTimeout(() => setError(null), 3000)
      return
    }

    setSharing(true)
    setError(null)

    try {
      const baseUrl = window.location.origin
      const userName = session.user?.name || 'Någon'

      // Build Block Kit message with sharer's name
      const blocks = buildNewsBlocks({
        id: newsId,
        companyName,
        headline,
        orgNumber,
        protocolType,
        protocolDate,
        noticeText,
        logoUrl,
        newsValue,
        sharedBy: userName,
      }, baseUrl)

      // Fallback text for notifications
      const fallbackText = headline
        ? `📰 ${companyName}: ${headline}`
        : `📰 Ny händelse för ${companyName}`

      let response

      if (isScheduled) {
        // Calculate Unix timestamp for scheduled time
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
        const post_at = Math.floor(scheduledDateTime.getTime() / 1000)

        response = await fetch('/api/slack/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fallbackText,
            blocks,
            post_at,
          }),
        })
      } else {
        response = await fetch('/api/slack/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fallbackText,
            blocks,
          }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Share to chat failed:', errorData)
        throw new Error(errorData.error || 'Failed to share')
      }

      if (isScheduled) {
        setScheduled(true)
        setShowScheduler(false)
        setTimeout(() => setScheduled(false), 3000)
      } else {
        setShared(true)
        setTimeout(() => setShared(false), 3000)
      }

      // Reset schedule inputs
      setScheduleDate('')
      setScheduleTime('')
    } catch (err) {
      console.error('Error sharing to chat:', err)
      setError('Kunde inte dela')
      setTimeout(() => setError(null), 3000)
    } finally {
      setSharing(false)
    }
  }

  // Get min date/time for scheduler (now + 2 minutes)
  const now = new Date()
  now.setMinutes(now.getMinutes() + 2)
  const minDate = now.toISOString().split('T')[0]
  const minTime = now.toTimeString().slice(0, 5)

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        {/* Main share button */}
        <button
          onClick={() => handleShare(false)}
          disabled={sharing || shared || scheduled}
          className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
            shared || scheduled
              ? 'text-green-600 dark:text-green-400'
              : error
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
          }`}
          title="Dela till redaktionen via Slack"
        >
          {sharing ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Delar...</span>
            </>
          ) : shared ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Delat!</span>
            </>
          ) : scheduled ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Schemalagt!</span>
            </>
          ) : error ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{error}</span>
            </>
          ) : (
            <>
              {/* Slack logo */}
              <svg className="w-4 h-4" viewBox="0 0 127 127" fill="none">
                <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
                <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H14c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33z" fill="#36C5F0"/>
                <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V14c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v32.9z" fill="#2EB67D"/>
                <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2h-33z" fill="#ECB22E"/>
              </svg>
              <span>Dela</span>
            </>
          )}
        </button>

        {/* Schedule dropdown button */}
        {!shared && !scheduled && !sharing && !error && (
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Schemalägg delning"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showScheduler ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Schedule picker dropdown */}
      {showScheduler && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[240px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Schemalägg publicering
            </span>
            <button
              onClick={() => setShowScheduler(false)}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Datum</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={minDate}
                className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Tid</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                min={scheduleDate === minDate ? minTime : undefined}
                className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={() => handleShare(true)}
              disabled={sharing || !scheduleDate || !scheduleTime}
              className="w-full mt-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {sharing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Schemalägger...
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  Schemalägg
                </>
              )}
            </button>
          </div>

          {/* Quick options */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 mb-1.5">Snabbval:</p>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Om 1h', hours: 1 },
                { label: 'Om 3h', hours: 3 },
                { label: 'Imorgon 09:00', hours: 'tomorrow' as const },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => {
                    const date = new Date()
                    if (option.hours === 'tomorrow') {
                      date.setDate(date.getDate() + 1)
                      date.setHours(9, 0, 0, 0)
                    } else {
                      date.setHours(date.getHours() + option.hours)
                    }
                    setScheduleDate(date.toISOString().split('T')[0])
                    setScheduleTime(date.toTimeString().slice(0, 5))
                  }}
                  className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
