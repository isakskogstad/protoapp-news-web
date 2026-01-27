'use client'

import { StyrelseFaktaruta as StyrelseFaktarutaType } from '@/lib/types'

interface StyrelseFaktarutaProps {
  data?: StyrelseFaktarutaType
}

export default function StyrelseFaktaruta({ data }: StyrelseFaktarutaProps) {
  if (!data) return null

  const hasNewMembers = data.nyaLedamoter && data.nyaLedamoter.length > 0
  const hasLeavingMembers = data.avgaendeLedamoter && data.avgaendeLedamoter.length > 0
  const hasNewChairman = data.nyOrdforande && data.nyOrdforande.trim() !== ''

  // Don't render if there are no changes
  if (!hasNewMembers && !hasLeavingMembers && !hasNewChairman) return null

  return (
    <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
          Styrelseforandringar
        </h3>
      </div>

      <div className="space-y-4">
        {/* New chairman */}
        {hasNewChairman && (
          <div className="bg-purple-100 dark:bg-purple-900/40 rounded-lg px-3 py-2.5 -mx-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400">Ny ordforande</p>
                <p className="text-sm font-bold text-purple-800 dark:text-purple-200">
                  {data.nyOrdforande}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New members - green list */}
        {hasNewMembers && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Nya ledamoter
              </span>
            </div>
            <ul className="space-y-1.5 ml-5">
              {data.nyaLedamoter.map((name, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-purple-900 dark:text-purple-100">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Leaving members - red list */}
        {hasLeavingMembers && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Avgaende ledamoter
              </span>
            </div>
            <ul className="space-y-1.5 ml-5">
              {data.avgaendeLedamoter.map((name, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 flex-shrink-0" />
                  <span className="text-sm text-purple-900 dark:text-purple-100 line-through opacity-75">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision date */}
        {data.beslutsdatum && (
          <div className="pt-2 border-t border-purple-200 dark:border-purple-800/50">
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Beslut: {data.beslutsdatum}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
