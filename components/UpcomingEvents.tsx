'use client'

import { Calendar, Plus, Check, MapPin, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface UpcomingEvent {
  id: string
  title: string
  company: string
  date: string // ISO date string
  time?: string // Optional time string like "13:00"
  location?: string
  type: 'stamma' | 'kallelse' | 'event'
  noticeText?: string // Full notice text for expansion
}

const CALENDAR_KEY = 'loopdesk_calendar_events'

function getAddedEvents(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const stored = localStorage.getItem(CALENDAR_KEY)
  return stored ? new Set(JSON.parse(stored)) : new Set()
}

function toggleCalendarEvent(id: string): boolean {
  const events = getAddedEvents()
  if (events.has(id)) {
    events.delete(id)
  } else {
    events.add(id)
  }
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(Array.from(events)))
  return events.has(id)
}

function formatEventDate(dateStr: string): { month: string; day: string; time: string } {
  const date = new Date(dateStr)
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']
  return {
    month: months[date.getMonth()],
    day: date.getDate().toString(),
    time: date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

interface UpcomingEventsProps {
  events: UpcomingEvent[]
  maxItems?: number
}

export default function UpcomingEvents({ events, maxItems = 5 }: UpcomingEventsProps) {
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set())
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  useEffect(() => {
    setAddedEvents(getAddedEvents())
  }, [])

  const handleToggle = (id: string) => {
    const isAdded = toggleCalendarEvent(id)
    setAddedEvents(prev => {
      const next = new Set(prev)
      if (isAdded) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Sort by date and take maxItems
  const sortedEvents = [...events]
    .filter(e => new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, maxItems)

  if (sortedEvents.length === 0) {
    return (
      <div className="py-8 text-center">
        <Calendar className="w-6 h-6 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-xs text-gray-400 dark:text-gray-500">Inga kommande händelser</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sortedEvents.map((event, i) => {
        const { month, day, time } = formatEventDate(event.date)
        const daysUntil = getDaysUntil(event.date)
        const isAdded = addedEvents.has(event.id)
        const isUrgent = daysUntil <= 3
        const isExpanded = expandedEvent === event.id

        return (
          <div
            key={event.id}
            className={`
              ${i !== sortedEvents.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}
            `}
          >
            <div
              onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
              className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group relative"
            >
              {/* Date box */}
              <div className={`
                w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 border transition-colors
                ${isUrgent
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:bg-white dark:group-hover:bg-gray-700'
                }
              `}>
                <span className="text-[9px] font-bold uppercase leading-none">{month}</span>
                <span className="text-sm font-mono font-bold leading-none mt-0.5">{day}</span>
              </div>

              {/* Details */}
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {event.title}
                  </span>
                  {isUrgent && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">
                      {daysUntil === 0 ? 'IDAG' : daysUntil === 1 ? 'IMORGON' : `${daysUntil}D`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate">
                    {event.company}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                    {event.time || time}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500" />
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{event.location}</span>
                  </div>
                )}
              </div>

              {/* Expand indicator */}
              {event.noticeText && (
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              )}

              {/* Action button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggle(event.id) }}
                className={`
                  absolute right-8 top-3 p-1.5 rounded-full border transition-all shadow-sm
                  ${isAdded
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white'
                  }
                `}
                title={isAdded ? 'Tillagd i kalender' : 'Lägg till i kalender'}
              >
                {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
            </div>

            {/* Expanded details */}
            {isExpanded && event.noticeText && (
              <div className="px-3 pb-3 pl-[68px]">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2 line-clamp-4">
                  {event.noticeText}
                </p>
                <Link
                  href={`/news/${event.id}`}
                  className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Läs mer →
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
