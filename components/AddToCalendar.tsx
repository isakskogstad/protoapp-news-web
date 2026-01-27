'use client'

import { useState } from 'react'

interface AddToCalendarProps {
  title: string
  description?: string
  date?: string // ISO date string or readable date
  companyName: string
  eventType?: string
}

export default function AddToCalendar({
  title,
  description,
  date,
  companyName,
  eventType
}: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Parse date and create calendar-friendly format
  const parseDate = (dateStr?: string): { start: string; end: string } | null => {
    if (!dateStr) return null

    try {
      // Try to parse various date formats
      let parsedDate: Date | null = null

      // Try ISO format first
      if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        parsedDate = new Date(dateStr)
      }
      // Try Swedish format (2024-01-15 or 15 januari 2024)
      else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        parsedDate = new Date(dateStr.split(' ')[0])
      }
      // Try to extract date from text
      else {
        const dateMatch = dateStr.match(/(\d{1,2})\s*(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s*(\d{4})/i)
        if (dateMatch) {
          const months: Record<string, number> = {
            januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
            juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11
          }
          parsedDate = new Date(
            parseInt(dateMatch[3]),
            months[dateMatch[2].toLowerCase()],
            parseInt(dateMatch[1])
          )
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) return null

      // Format for Google Calendar (YYYYMMDDTHHmmssZ)
      const formatDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }

      // Create all-day event (start and end on same day)
      const startDate = new Date(parsedDate)
      startDate.setHours(9, 0, 0, 0)

      const endDate = new Date(parsedDate)
      endDate.setHours(17, 0, 0, 0)

      return {
        start: formatDate(startDate),
        end: formatDate(endDate)
      }
    } catch {
      return null
    }
  }

  const dates = parseDate(date)

  const generateGoogleCalendarUrl = () => {
    const baseUrl = 'https://calendar.google.com/calendar/render'
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${eventType || 'Bolagshändelse'}: ${companyName}`,
      details: [
        title,
        description ? `\n${description}` : '',
        `\n\nKälla: LoopDesk`
      ].join(''),
    })

    if (dates) {
      params.set('dates', `${dates.start}/${dates.end}`)
    }

    return `${baseUrl}?${params.toString()}`
  }

  const generateOutlookUrl = () => {
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose'
    const params = new URLSearchParams({
      subject: `${eventType || 'Bolagshändelse'}: ${companyName}`,
      body: [title, description || '', 'Källa: LoopDesk'].filter(Boolean).join('\n\n'),
      path: '/calendar/action/compose',
    })

    if (dates) {
      params.set('startdt', dates.start)
      params.set('enddt', dates.end)
    }

    return `${baseUrl}?${params.toString()}`
  }

  const generateICalData = () => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const uid = `loopdesk-${Date.now()}@loopdesk.up.railway.app`

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LoopDesk//Calendar//SV',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      dates ? `DTSTART:${dates.start}` : `DTSTART:${now}`,
      dates ? `DTEND:${dates.end}` : `DTEND:${now}`,
      `SUMMARY:${eventType || 'Bolagshändelse'}: ${companyName}`,
      `DESCRIPTION:${title}${description ? '\\n\\n' + description : ''}\\n\\nKälla: LoopDesk`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    return icalContent
  }

  const downloadICalFile = () => {
    const icalData = generateICalData()
    const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_event.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Lägg till i kalender
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
            <div className="p-1">
              <a
                href={generateGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15h-3v-6h3v6zm0-8h-3V7h3v3zm4.5 8h-3v-4h3v4zm0-6h-3V7h3v5zm4.5 6h-3V9h3v9z"/>
                </svg>
                Google Calendar
              </a>

              <a
                href={generateOutlookUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.17 2.06A1.76 1.76 0 0019.5 1h-15A1.76 1.76 0 002.83 2.06 1.76 1.76 0 002 3.5v17A1.76 1.76 0 003.5 22h17a1.76 1.76 0 001.5-1.5v-17a1.76 1.76 0 00-.83-1.44zM19 19H5V8h14v11z"/>
                </svg>
                Outlook
              </a>

              <button
                onClick={downloadICalFile}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Ladda ner .ics-fil
              </button>
            </div>

            {!dates && (
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Inget datum hittades. Du kan ange datum manuellt i kalendern.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
