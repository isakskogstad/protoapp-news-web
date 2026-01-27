'use client'

import { BolagsInfo } from '@/lib/types'

interface BolagsInfoCardProps {
  data?: BolagsInfo
}

export default function BolagsInfoCard({ data }: BolagsInfoCardProps) {
  if (!data) return null

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Bolagsinformation
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Omsattning */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Omsattning {data.omsattningAr}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {data.omsattning}
            </p>
          </div>
        </div>

        {/* Antal anstallda */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Anstallda</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {data.anstallda}
            </p>
          </div>
        </div>

        {/* VD */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">VD</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {data.vd || '-'}
            </p>
          </div>
        </div>

        {/* Grundat */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Grundat</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {data.startat}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
