'use client'

import { useState, useEffect } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { formatOrgNumber } from '@/lib/utils'

interface BolagsfaktaModuleProps {
  orgNumber: string
  companyName: string
  // Optional pre-loaded data
  initialData?: {
    vd?: string
    ordforande?: string
    anstallda?: number
    omsattning?: string
    omsattningAr?: number
    startat?: string
    bransch?: string
  }
}

interface CompanyData {
  vd?: string
  ordforande?: string
  anstallda?: number
  omsattning?: string
  omsattningAr?: number
  startat?: string
  bransch?: string
  stad?: string
  adress?: string
  postnummer?: string
  storstAgare?: string
}

export default function BolagsfaktaModule({ orgNumber, companyName, initialData }: BolagsfaktaModuleProps) {
  const [data, setData] = useState<CompanyData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)

  // Fetch company data if not provided
  useEffect(() => {
    if (initialData) return

    const fetchData = async () => {
      try {
        // Try to fetch from our API which queries Supabase
        const response = await fetch(`/api/company/${orgNumber}`)
        if (response.ok) {
          const companyData = await response.json()
          setData(companyData)
        }
      } catch (e) {
        console.error('Failed to fetch company data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orgNumber, initialData])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
          <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bolagsfakta</h3>
        </div>
        <div className="p-8 flex items-center justify-center flex-1">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  // Show basic info even if we don't have full data
  const hasData = data && (data.vd || data.ordforande || data.anstallda || data.omsattning || data.startat || data.bransch || data.stad || data.storstAgare)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bolagsfakta</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Always show org number */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm font-bold text-black dark:text-white">{companyName}</span>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{formatOrgNumber(orgNumber)}</span>
        </div>

        {hasData ? (
          <div className="grid grid-cols-2 gap-3">
            {/* VD */}
            {data.vd && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">VD</p>
                <p className="text-xs font-medium text-black dark:text-white truncate">{data.vd}</p>
              </div>
            )}

            {/* Ordförande */}
            {data.ordforande && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Ordförande</p>
                <p className="text-xs font-medium text-black dark:text-white truncate">{data.ordforande}</p>
              </div>
            )}

            {/* Anställda */}
            {data.anstallda !== undefined && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Anställda</p>
                <p className="text-xs font-medium text-black dark:text-white">{data.anstallda}</p>
              </div>
            )}

            {/* Grundat */}
            {data.startat && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Grundat</p>
                <p className="text-xs font-medium text-black dark:text-white">{data.startat}</p>
              </div>
            )}

            {/* Stad */}
            {data.stad && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Säte</p>
                <p className="text-xs font-medium text-black dark:text-white truncate">{data.stad}</p>
              </div>
            )}

            {/* Största ägare */}
            {data.storstAgare && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Största ägare</p>
                <p className="text-xs font-medium text-black dark:text-white truncate">{data.storstAgare}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
            Ingen ytterligare bolagsinformation tillgänglig
          </p>
        )}
      </div>
    </div>
  )
}
