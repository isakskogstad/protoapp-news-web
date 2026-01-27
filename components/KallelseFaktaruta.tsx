'use client'

import { KallelseFaktaruta as KallelseFaktarutaType } from '@/lib/types'
import { Calendar, Clock, MapPin, Plus } from 'lucide-react'

interface KallelseFaktarutaProps {
  data?: KallelseFaktarutaType
}

export default function KallelseFaktaruta({ data }: KallelseFaktarutaProps) {
  if (!data) return null

  const handleAddToCalendar = () => {
    // Create ICS file content
    const startDate = parseSwedishDate(data.datum)
    const title = `${data.stammatyp} - ${data.bolagsnamn}`
    const location = data.plats || ''

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(new Date(startDate.getTime() + 2 * 60 * 60 * 1000))}
SUMMARY:${title}
LOCATION:${location}
DESCRIPTION:${data.stammatyp} för ${data.bolagsnamn}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.bolagsnamn}-stamma.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kallelse till stämma</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Meeting type */}
        <div className="mb-4">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {data.stammatyp}
          </span>
        </div>

        {/* Date and time */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Datum
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.datum}
            </span>
          </div>

          {data.tid && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Tid
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.tid}
              </span>
            </div>
          )}

          {data.plats && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Plats
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[60%]">
                {data.plats}
              </span>
            </div>
          )}
        </div>

        {/* Add to calendar button */}
        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleAddToCalendar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Lägg till i kalender
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions to extract date parts
function parseSwedishDate(dateStr: string): Date {
  // Try ISO format first
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
  }

  // Fallback to current date
  return new Date()
}

function formatICSDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
}
