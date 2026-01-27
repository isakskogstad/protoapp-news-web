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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-bold text-black dark:text-white">Kallelse till stämma</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Meeting type badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            {data.stammatyp}
          </span>
        </div>

        {/* Main info card */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 mb-3 border border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-3">
            {/* Calendar visual */}
            <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-lg flex flex-col items-center justify-center shadow-sm flex-shrink-0 border border-gray-200 dark:border-gray-700">
              <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                {getMonthAbbr(data.datum)}
              </span>
              <span className="text-lg font-bold text-black dark:text-white -mt-0.5">
                {getDayNumber(data.datum)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Date and time */}
              <p className="text-sm font-bold text-black dark:text-white">
                {data.datum}
              </p>
              {data.tid && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Clock className="w-3 h-3" />
                  {data.tid}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        {data.plats && (
          <div className="flex items-start gap-2.5 mb-3">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Plats</p>
              <p className="text-sm font-medium text-black dark:text-white">
                {data.plats}
              </p>
            </div>
          </div>
        )}

        {/* Add to calendar button */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleAddToCalendar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
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
function getMonthAbbr(dateStr: string): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']

  // Try to parse various date formats
  const isoMatch = dateStr.match(/^\d{4}-(\d{2})-\d{2}/)
  if (isoMatch) {
    const monthNum = parseInt(isoMatch[1], 10) - 1
    return months[monthNum] || ''
  }

  // Try Swedish month names
  const swedishMonths = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
  for (let i = 0; i < swedishMonths.length; i++) {
    if (dateStr.toLowerCase().includes(swedishMonths[i])) {
      return months[i]
    }
  }

  return ''
}

function getDayNumber(dateStr: string): string {
  // Try ISO format: 2024-03-15
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-(\d{2})/)
  if (isoMatch) {
    return parseInt(isoMatch[1], 10).toString()
  }

  // Try "15 mars 2024" format
  const swedishMatch = dateStr.match(/^(\d{1,2})\s/)
  if (swedishMatch) {
    return swedishMatch[1]
  }

  // Try "15/3/2024" format
  const slashMatch = dateStr.match(/^(\d{1,2})\//)
  if (slashMatch) {
    return slashMatch[1]
  }

  return ''
}

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
