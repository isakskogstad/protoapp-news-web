'use client'

import { useState, useEffect } from 'react'
import { NewsItem } from '@/lib/types'

interface SlackShareModalProps {
  item: NewsItem
  isOpen: boolean
  onClose: () => void
}

export default function SlackShareModal({ item, isOpen, onClose }: SlackShareModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [hasStoredWebhook, setHasStoredWebhook] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('loopdesk_slack_webhook')
    if (stored) {
      setWebhookUrl(stored)
      setHasStoredWebhook(true)
    }

    // Default message
    const shareUrl = `${window.location.origin}/news/${item.id}`
    setMessage(`${item.headline || 'Ny bolagshändelse'}\n\n${shareUrl}`)
  }, [item])

  const handleSend = async () => {
    if (!webhookUrl) return

    setIsSending(true)
    setStatus('idle')

    // Save webhook for future use
    localStorage.setItem('loopdesk_slack_webhook', webhookUrl)

    const shareUrl = `${window.location.origin}/news/${item.id}`

    try {
      const response = await fetch('/api/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          message: {
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `📢 ${item.companyName}`,
                  emoji: true
                }
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${item.headline || 'Ny bolagshändelse'}*`
                }
              },
              ...(item.noticeText ? [{
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: item.noticeText.substring(0, 500) + (item.noticeText.length > 500 ? '...' : '')
                }
              }] : []),
              ...(message && message !== `${item.headline || 'Ny bolagshändelse'}\n\n${shareUrl}` ? [{
                type: 'context',
                elements: [{
                  type: 'mrkdwn',
                  text: `💬 ${message.split('\n')[0]}`
                }]
              }] : []),
              {
                type: 'divider'
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `🏢 Org.nr: ${item.orgNumber}`
                  },
                  {
                    type: 'mrkdwn',
                    text: `📅 ${new Date(item.timestamp).toLocaleDateString('sv-SE')}`
                  }
                ]
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'Läs mer på LoopDesk',
                      emoji: true
                    },
                    url: shareUrl,
                    style: 'primary'
                  },
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'Visa på Allabolag',
                      emoji: true
                    },
                    url: `https://www.allabolag.se/${item.orgNumber.replace(/-/g, '')}`
                  }
                ]
              }
            ]
          }
        })
      })

      if (response.ok) {
        setStatus('success')
        setTimeout(() => {
          onClose()
          setStatus('idle')
        }, 1500)
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Slack send error:', err)
      setStatus('error')
    }

    setIsSending(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full pointer-events-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Dela i Slack
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Skicka till en kanal eller person
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              {!hasStoredWebhook && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Skapa en webhook
                  </a>
                  {' '}i din Slack-arbetsyta. URL:en sparas lokalt.
                </p>
              )}
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Förhandsvisning:</p>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{item.companyName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.headline}</p>
              </div>
            </div>

            {/* Optional message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Meddelande (valfritt)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Lägg till en kommentar..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
              />
            </div>

            {/* Status */}
            {status === 'success' && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Skickat till Slack!
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Kunde inte skicka. Kontrollera webhook-URL:en.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={handleSend}
              disabled={!webhookUrl || isSending}
              className="px-4 py-2 text-sm font-medium text-white bg-[#4A154B] hover:bg-[#3a1039] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Skicka till Slack
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
