'use client'

import { NyemissionFaktaruta as NyemissionFaktarutaType } from '@/lib/types'
import { TrendingUp } from 'lucide-react'

interface NyemissionFaktarutaProps {
  data?: NyemissionFaktarutaType
}

export default function NyemissionFaktaruta({ data }: NyemissionFaktarutaProps) {
  if (!data) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nyemission</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Facts list */}
        <div className="space-y-3">
          {/* Emissionstyp */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Emissionstyp</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.emissionstyp}
            </span>
          </div>

          {/* Antal aktier */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Antal aktier</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.antalAktier}
            </span>
          </div>

          {/* Teckningskurs */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Teckningskurs</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.teckningskurs}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

          {/* Emissionsbelopp */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Emissionsbelopp</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {data.emissionsbelopp}
            </span>
          </div>

          {/* Utspädning */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Utspädning</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.utspädning}
            </span>
          </div>

          {/* Teckningsperiod */}
          {data.teckningsperiod && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Teckningsperiod</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.teckningsperiod}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
