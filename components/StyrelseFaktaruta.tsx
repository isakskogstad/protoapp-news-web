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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-sm font-bold text-black dark:text-white">Styrelseförändringar</h3>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* New chairman */}
        {hasNewChairman && (
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase">Ny ordförande</p>
                <p className="text-sm font-bold text-black dark:text-white">
                  {data.nyOrdforande}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New members - green list */}
        {hasNewMembers && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <UserPlus className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 uppercase">
                Nya ledamöter
              </span>
            </div>
            <ul className="space-y-1.5 ml-5">
              {data.nyaLedamoter.map((name, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-black dark:text-white">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Leaving members - red list */}
        {hasLeavingMembers && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <UserMinus className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
              <span className="text-[10px] font-mono font-medium text-red-600 dark:text-red-400 uppercase">
                Avgående ledamöter
              </span>
            </div>
            <ul className="space-y-1.5 ml-5">
              {data.avgaendeLedamoter.map((name, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision date */}
        {data.beslutsdatum && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>Beslut: {data.beslutsdatum}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
