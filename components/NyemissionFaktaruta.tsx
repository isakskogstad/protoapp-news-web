'use client'

import { NyemissionFaktaruta as NyemissionFaktarutaType } from '@/lib/types'
import { TrendingUp, AlertTriangle } from 'lucide-react'

interface NyemissionFaktarutaProps {
  data?: NyemissionFaktarutaType
}

export default function NyemissionFaktaruta({ data }: NyemissionFaktarutaProps) {
  if (!data) return null

  // Parse utspädning to check if it's high (over 20%)
  const utspädningValue = parseFloat(data.utspädning.replace('%', '').replace(',', '.'))
  const isHighDilution = !isNaN(utspädningValue) && utspädningValue > 20

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-sm font-bold text-black dark:text-white">Nyemission</h3>
      </div>

      <div className="p-4">
        {/* Facts grid */}
        <div className="space-y-3">
          {/* Emissionstyp */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Emissionstyp</span>
            <span className="text-sm font-medium text-black dark:text-white">
              {data.emissionstyp}
            </span>
          </div>

          {/* Antal aktier */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Antal aktier</span>
            <span className="text-sm font-medium text-black dark:text-white">
              {data.antalAktier}
            </span>
          </div>

          {/* Teckningskurs */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Teckningskurs</span>
            <span className="text-sm font-medium text-black dark:text-white">
              {data.teckningskurs}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

          {/* Emissionsbelopp - highlighted */}
          <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
            <span className="text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 uppercase">Emissionsbelopp</span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {data.emissionsbelopp}
            </span>
          </div>

          {/* Utspädning - orange if high */}
          <div className={`flex justify-between items-center rounded-lg px-3 py-2 border ${
            isHighDilution
              ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <span className={`text-[10px] font-mono font-medium uppercase ${
              isHighDilution ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              Utspädning
            </span>
            <div className="flex items-center gap-1.5">
              {isHighDilution && (
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
              )}
              <span className={`text-sm font-bold ${
                isHighDilution ? 'text-orange-700 dark:text-orange-400' : 'text-black dark:text-white'
              }`}>
                {data.utspädning}
              </span>
            </div>
          </div>

          {/* Teckningsperiod */}
          {data.teckningsperiod && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Teckningsperiod</span>
              <span className="text-sm font-medium text-black dark:text-white">
                {data.teckningsperiod}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
