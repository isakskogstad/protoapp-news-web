'use client'

import { StyrelseFaktaruta as StyrelseFaktarutaType } from '@/lib/types'
import { Users, Star, UserPlus, UserMinus, Calendar } from 'lucide-react'

interface StyrelseFaktarutaProps {
  data?: StyrelseFaktarutaType
}

export default function StyrelseFaktaruta({ data }: StyrelseFaktarutaProps) {
  if (!data) return null

  const hasNewMembers = data.nyaLedamoter && data.nyaLedamoter.length > 0
  const hasLeavingMembers = data.avgaendeLedamoter && data.avgaendeLedamoter.length > 0
  const hasNewChairman = data.nyOrdforande && data.nyOrdforande.trim() !== ''

  // Don't render if there are no changes
  if (!hasNewMembers && !hasLeavingMembers && !hasNewChairman) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Styrelseförändringar</h3>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* New chairman */}
        {hasNewChairman && (
          <div className="flex items-center gap-3">
            <Star className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ny ordförande</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.nyOrdforande}
              </p>
            </div>
          </div>
        )}

        {/* New members */}
        {hasNewMembers && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Nya ledamöter
              </span>
            </div>
            <ul className="space-y-1 ml-5">
              {data.nyaLedamoter.map((name, index) => (
                <li key={index} className="text-sm text-gray-900 dark:text-gray-100">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Leaving members */}
        {hasLeavingMembers && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserMinus className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Avgående ledamöter
              </span>
            </div>
            <ul className="space-y-1 ml-5">
              {data.avgaendeLedamoter.map((name, index) => (
                <li key={index} className="text-sm text-gray-500 dark:text-gray-400">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision date */}
        {data.beslutsdatum && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Beslut: {data.beslutsdatum}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
