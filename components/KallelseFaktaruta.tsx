'use client'

import { KallelseFaktaruta as KallelseFaktarutaType } from '@/lib/types'
import AddToCalendar from './AddToCalendar'

interface KallelseFaktarutaProps {
  data?: KallelseFaktarutaType
}

export default function KallelseFaktaruta({ data }: KallelseFaktarutaProps) {
  if (!data) return null

  return (
    <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
      {/* Header with calendar icon */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Kallelse till stämma
        </h3>
      </div>

      {/* Meeting type badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
          {data.stammatyp}
        </span>
      </div>

      {/* Main info card */}
      <div className="bg-slate-100 dark:bg-slate-800/40 rounded-lg px-4 py-3 mb-3">
        <div className="flex items-start gap-3">
          {/* Calendar visual */}
          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg flex flex-col items-center justify-center shadow-sm flex-shrink-0 border border-blue-200 dark:border-blue-800">
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">
              {getMonthAbbr(data.datum)}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 -mt-0.5">
              {getDayNumber(data.datum)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Date and time */}
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.datum}
            </p>
            {data.tid && (
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {data.tid}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Location */}
      {data.plats && (
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Plats</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {data.plats}
            </p>
          </div>
        </div>
      )}

      {/* Add to calendar button */}
      <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/50">
        <AddToCalendar
          title={`${data.stammatyp} - ${data.bolagsnamn}`}
          description={`${data.stammatyp} för ${data.bolagsnamn}${data.plats ? `. Plats: ${data.plats}` : ''}`}
          date={data.datum}
          companyName={data.bolagsnamn}
          eventType={data.stammatyp}
        />
      </div>
    </div>
  )
}

// Helper functions to extract date parts
function getMonthAbbr(dateStr: string): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

  // Try to parse various date formats
  // Format: "2024-03-15" or "15 mars 2024" or "15/3/2024"
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
