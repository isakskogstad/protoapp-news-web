'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { buildNewsBlocks } from '@/lib/slack-blocks'

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

  if (!session) return null

  const handleShare = async () => {
    if (sharing || shared) return

    setSharing(true)
    setError(null)

    try {
      const baseUrl = window.location.origin

      // Build Block Kit message
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
      }, baseUrl)

      // Fallback text for notifications
      const fallbackText = headline
        ? `📰 ${companyName}: ${headline}`
        : `📰 Ny händelse för ${companyName}`

      const response = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fallbackText,
          blocks,
          asUser: true, // Send as the logged-in user, not as bot
        }),
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
          <span>Dela till redaktionen</span>
        </>
      )}
    </button>
  )
}
