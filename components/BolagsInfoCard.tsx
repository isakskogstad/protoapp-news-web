'use client'

import { BolagsInfo } from '@/lib/types'
import { DollarSign, Users, User, Calendar } from 'lucide-react'

interface BolagsInfoCardProps {
  data?: BolagsInfo
}

export default function BolagsInfoCard({ data }: BolagsInfoCardProps) {
  if (!data) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Bolagsinformation
        </h3>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Omsättning */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">
                Omsättning {data.omsattningAr}
              </p>
              <p className="text-sm font-bold text-black dark:text-white truncate">
                {data.omsattning}
              </p>
            </div>
          </div>

          {/* Antal anställda */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Anställda</p>
              <p className="text-sm font-bold text-black dark:text-white">
                {data.anstallda}
              </p>
            </div>
          </div>

          {/* VD */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">VD</p>
              <p className="text-sm font-bold text-black dark:text-white truncate">
                {data.vd || '-'}
              </p>
            </div>
          </div>

          {/* Grundat */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Grundat</p>
              <p className="text-sm font-bold text-black dark:text-white">
                {data.startat}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
