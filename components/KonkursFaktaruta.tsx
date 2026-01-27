'use client'

import { KonkursFaktaruta as KonkursFaktarutaType } from '@/lib/types'
import { AlertTriangle, Calendar, Building2, User, Briefcase, Clock } from 'lucide-react'

interface KonkursFaktarutaProps {
  data?: KonkursFaktarutaType
}

export default function KonkursFaktaruta({ data }: KonkursFaktarutaProps) {
  if (!data) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
      {/* Header with warning */}
      <div className="px-4 py-3 border-b border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/30 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-sm font-bold text-red-900 dark:text-red-300">Konkursbeslut</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Facts list */}
        <div className="space-y-3">
          {/* Beslutsdatum */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Beslutsdatum</p>
              <p className="text-sm font-bold text-black dark:text-white">
                {data.beslutsdatum}
              </p>
            </div>
          </div>

          {/* Tingsrätt */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Tingsrätt</p>
              <p className="text-sm font-bold text-black dark:text-white">
                {data.tingsratt}
              </p>
            </div>
          </div>

          {/* Konkursförvaltare */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Konkursförvaltare</p>
              <p className="text-sm font-bold text-black dark:text-white">
                {data.konkursforvaltare}
              </p>
            </div>
          </div>

          {/* Förvaltarbyrå */}
          {data.forvaltarbyra && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase">Förvaltarbyrå</p>
                <p className="text-sm font-bold text-black dark:text-white">
                  {data.forvaltarbyra}
                </p>
              </div>
            </div>
          )}

          {/* Bevakningsfrist - highlighted */}
          {data.bevakningsfrist && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-[10px] font-mono text-red-600 dark:text-red-400 uppercase">Bevakningsfrist</p>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">
                      {data.bevakningsfrist}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
