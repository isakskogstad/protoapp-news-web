'use client'

import { KonkursFaktaruta as KonkursFaktarutaType } from '@/lib/types'
import { AlertTriangle, Calendar, Building2, User, Briefcase, Clock } from 'lucide-react'

interface KonkursFaktarutaProps {
  data?: KonkursFaktarutaType
}

export default function KonkursFaktaruta({ data }: KonkursFaktarutaProps) {
  if (!data) return null

  return (
    <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header with warning */}
      <div className="px-4 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        </div>
        <h3 className="text-sm font-bold text-red-900">Konkursbeslut</h3>
      </div>

      <div className="p-4">
        {/* Facts list */}
        <div className="space-y-3">
          {/* Beslutsdatum */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-mono text-gray-500 uppercase">Beslutsdatum</p>
              <p className="text-sm font-bold text-black">
                {data.beslutsdatum}
              </p>
            </div>
          </div>

          {/* Tingsrätt */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-mono text-gray-500 uppercase">Tingsrätt</p>
              <p className="text-sm font-bold text-black">
                {data.tingsratt}
              </p>
            </div>
          </div>

          {/* Konkursförvaltare */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-mono text-gray-500 uppercase">Konkursförvaltare</p>
              <p className="text-sm font-bold text-black">
                {data.konkursforvaltare}
              </p>
            </div>
          </div>

          {/* Förvaltarbyrå */}
          {data.forvaltarbyra && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-mono text-gray-500 uppercase">Förvaltarbyrå</p>
                <p className="text-sm font-bold text-black">
                  {data.forvaltarbyra}
                </p>
              </div>
            </div>
          )}

          {/* Bevakningsfrist - highlighted */}
          {data.bevakningsfrist && (
            <>
              <div className="border-t border-gray-200 my-2" />
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-[10px] font-mono text-red-600 uppercase">Bevakningsfrist</p>
                    <p className="text-sm font-bold text-red-800">
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
