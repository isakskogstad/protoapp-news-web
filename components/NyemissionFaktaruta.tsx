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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-black">Nyemission</h3>
      </div>

      <div className="p-4">
        {/* Facts grid */}
        <div className="space-y-3">
          {/* Emissionstyp */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Emissionstyp</span>
            <span className="text-sm font-medium text-black">
              {data.emissionstyp}
            </span>
          </div>

          {/* Antal aktier */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Antal aktier</span>
            <span className="text-sm font-medium text-black">
              {data.antalAktier}
            </span>
          </div>

          {/* Teckningskurs */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Teckningskurs</span>
            <span className="text-sm font-medium text-black">
              {data.teckningskurs}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-2" />

          {/* Emissionsbelopp - highlighted */}
          <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span className="text-[10px] font-mono font-medium text-emerald-700 uppercase">Emissionsbelopp</span>
            <span className="text-base font-bold text-emerald-700">
              {data.emissionsbelopp}
            </span>
          </div>

          {/* Utspädning - orange if high */}
          <div className={`flex justify-between items-center rounded-lg px-3 py-2 border ${
            isHighDilution
              ? 'bg-orange-50 border-orange-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <span className={`text-[10px] font-mono font-medium uppercase ${
              isHighDilution ? 'text-orange-700' : 'text-gray-600'
            }`}>
              Utspädning
            </span>
            <div className="flex items-center gap-1.5">
              {isHighDilution && (
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              )}
              <span className={`text-sm font-bold ${
                isHighDilution ? 'text-orange-700' : 'text-black'
              }`}>
                {data.utspädning}
              </span>
            </div>
          </div>

          {/* Teckningsperiod */}
          {data.teckningsperiod && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Teckningsperiod</span>
              <span className="text-sm font-medium text-black">
                {data.teckningsperiod}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
