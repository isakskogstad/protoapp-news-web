'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface ShareToChatProps {
  companyName: string
  headline?: string
  newsId: string
  className?: string
}

export default function ShareToChat({ companyName, headline, newsId, className = '' }: ShareToChatProps) {
  const { data: session } = useSession()
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session) return null

  const handleShare = async () => {
    if (sharing || shared) return

    setSharing(true)
    setError(null)

    try {
      // Create a formatted message for Slack
      const newsUrl = `${window.location.origin}/news/${newsId}`
      const message = headline
        ? `📰 *${companyName}*: ${headline}\n${newsUrl}`
        : `📰 Ny händelse för *${companyName}*\n${newsUrl}`

      const response = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })

      if (!response.ok) {
        throw new Error('Failed to share')
      }

      setShared(true)
      // Reset after 3 seconds
      setTimeout(() => setShared(false), 3000)
    } catch (err) {
      console.error('Error sharing to chat:', err)
      setError('Kunde inte dela')
      setTimeout(() => setError(null), 3000)
    } finally {
      setSharing(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing || shared}
      className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
        shared
          ? 'text-green-600 dark:text-green-400'
          : error
          ? 'text-red-600 dark:text-red-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
      } ${className}`}
      title="Dela i redaktionschatten"
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
      ) : error ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{error}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
          <span>Diskutera</span>
        </>
      )}
    </button>
  )
}
