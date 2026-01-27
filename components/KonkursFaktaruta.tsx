'use client'

import { KonkursFaktaruta as KonkursFaktarutaType } from '@/lib/types'

interface KonkursFaktarutaProps {
  data?: KonkursFaktarutaType
}

export default function KonkursFaktaruta({ data }: KonkursFaktarutaProps) {
  if (!data) return null

  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
      {/* Header with warning icon */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
          Konkursbeslut
        </h3>
      </div>

      {/* Facts list */}
      <div className="space-y-3">
        {/* Beslutsdatum */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-red-600 dark:text-red-400">Beslutsdatum</p>
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">
              {data.beslutsdatum}
            </p>
          </div>
        </div>

        {/* Tingsratt */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-red-600 dark:text-red-400">Tingsratt</p>
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">
              {data.tingsratt}
            </p>
          </div>
        </div>

        {/* Konkursforvaltare */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-red-600 dark:text-red-400">Konkursforvaltare</p>
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">
              {data.konkursforvaltare}
            </p>
          </div>
        </div>

        {/* Forvaltarbyra */}
        {data.forvaltarbyra && (
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-red-600 dark:text-red-400">Forvaltarbyra</p>
              <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                {data.forvaltarbyra}
              </p>
            </div>
          </div>
        )}

        {/* Bevakningsfrist - highlighted */}
        {data.bevakningsfrist && (
          <>
            <div className="border-t border-red-200 dark:border-red-800/50 my-2" />
            <div className="bg-red-100 dark:bg-red-900/40 rounded-lg px-3 py-2.5 -mx-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-[11px] text-red-600 dark:text-red-400">Bevakningsfrist</p>
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">
                    {data.bevakningsfrist}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
