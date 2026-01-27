'use client'

import { NyemissionFaktaruta as NyemissionFaktarutaType } from '@/lib/types'

interface NyemissionFaktarutaProps {
  data?: NyemissionFaktarutaType
}

export default function NyemissionFaktaruta({ data }: NyemissionFaktarutaProps) {
  if (!data) return null

  // Parse utspädning to check if it's high (over 20%)
  const utspädningValue = parseFloat(data.utspädning.replace('%', '').replace(',', '.'))
  const isHighDilution = !isNaN(utspädningValue) && utspädningValue > 20

  return (
    <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Nyemission
        </h3>
      </div>

      {/* Facts grid */}
      <div className="space-y-3">
        {/* Emissionstyp */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Emissionstyp</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.emissionstyp}
          </span>
        </div>

        {/* Antal aktier */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Antal aktier</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.antalAktier}
          </span>
        </div>

        {/* Teckningskurs */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Teckningskurs</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.teckningskurs}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700/50 my-2" />

        {/* Emissionsbelopp - highlighted with green accent */}
        <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 -mx-1">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Emissionsbelopp</span>
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
            {data.emissionsbelopp}
          </span>
        </div>

        {/* Utspädning - orange if high */}
        <div className={`flex justify-between items-center rounded-lg px-3 py-2 -mx-1 ${
          isHighDilution
            ? 'bg-orange-100 dark:bg-orange-900/40'
            : 'bg-gray-100 dark:bg-gray-800/40'
        }`}>
          <span className={`text-xs font-medium ${
            isHighDilution
              ? 'text-orange-700 dark:text-orange-300'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Utspädning
          </span>
          <div className="flex items-center gap-1.5">
            {isHighDilution && (
              <svg className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className={`text-sm font-semibold ${
              isHighDilution
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-gray-900 dark:text-gray-100'
            }`}>
              {data.utspädning}
            </span>
          </div>
        </div>

        {/* Teckningsperiod */}
        {data.teckningsperiod && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Teckningsperiod</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.teckningsperiod}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
