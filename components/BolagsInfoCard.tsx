'use client'

import { BolagsInfo } from '@/lib/types'
import { Building2 } from 'lucide-react'

interface BolagsInfoCardProps {
  data?: BolagsInfo
}

export default function BolagsInfoCard({ data }: BolagsInfoCardProps) {
  if (!data) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Bolagsinformation
        </h3>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Omsättning */}
          {data.omsattning && (
            <div className="min-w-0">
              <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">
                Omsättning {data.omsattningAr ? `(${data.omsattningAr})` : ''}
              </p>
              <p className="text-xs font-medium text-black dark:text-white truncate">
                {data.omsattning}
              </p>
            </div>
          )}

          {/* Antal anställda */}
          {data.anstallda !== undefined && (
            <div className="min-w-0">
              <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Anställda</p>
              <p className="text-xs font-medium text-black dark:text-white">
                {data.anstallda}
              </p>
            </div>
          )}

          {/* VD */}
          {data.vd && (
            <div className="min-w-0">
              <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">VD</p>
              <p className="text-xs font-medium text-black dark:text-white truncate">
                {data.vd}
              </p>
            </div>
          )}

          {/* Grundat */}
          {data.startat && (
            <div className="min-w-0">
              <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Grundat</p>
              <p className="text-xs font-medium text-black dark:text-white">
                {data.startat}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
