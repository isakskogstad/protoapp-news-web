'use client'

import { KonkursFaktaruta as KonkursFaktarutaType } from '@/lib/types'
import { AlertTriangle, Calendar, Building2, User, Briefcase, Clock } from 'lucide-react'

interface KonkursFaktarutaProps {
  data?: KonkursFaktarutaType
}

export default function KonkursFaktaruta({ data }: KonkursFaktarutaProps) {
  if (!data) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Konkursbeslut</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Facts list */}
        <div className="space-y-3">
          {/* Beslutsdatum */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Beslutsdatum
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.beslutsdatum}
            </span>
          </div>

          {/* Tingsrätt */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              Tingsrätt
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.tingsratt}
            </span>
          </div>

          {/* Konkursförvaltare */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Förvaltare
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.konkursforvaltare}
            </span>
          </div>

          {/* Förvaltarbyrå */}
          {data.forvaltarbyra && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                Byrå
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.forvaltarbyra}
              </span>
            </div>
          )}

          {/* Bevakningsfrist */}
          {data.bevakningsfrist && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Bevakningsfrist
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.bevakningsfrist}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
