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
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#30363d] flex items-center gap-3 shrink-0">
          <Building2 className="w-4 h-4 text-[#64748b] dark:text-[#8b949e]" />
          <h3 className="text-xs font-semibold text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider">Bolagsfakta</h3>
        </div>
        <div className="p-8 flex items-center justify-center flex-1">
          <Loader2 className="w-5 h-5 text-[#64748b] dark:text-[#8b949e] animate-spin" />
        </div>
      </div>
    )
  }

  // Show basic info even if we don't have full data
  const hasData = data && (data.vd || data.ordforande || data.anstallda || data.omsattning || data.startat || data.bransch || data.stad || data.storstAgare)

  return (
    <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-[#30363d] flex items-center gap-3 shrink-0">
        <Building2 className="w-4 h-4 text-[#64748b] dark:text-[#8b949e]" />
        <h3 className="text-xs font-semibold text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider">Bolagsfakta</h3>
      </div>

      <div className="p-5 flex-1">
        {/* Always show org number */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-[#30363d]">
          <span className="text-sm font-bold text-[#0f172a] dark:text-[#e6edf3]">{companyName}</span>
          <span className="text-xs font-mono text-[#94a3b8] dark:text-[#6e7681]">{formatOrgNumber(orgNumber)}</span>
        </div>

        {hasData ? (
          <div className="grid grid-cols-2 gap-4">
            {/* VD */}
            {data.vd && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider mb-1">VD</p>
                <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3] truncate">{data.vd}</p>
              </div>
            )}

            {/* Ordförande */}
            {data.ordforande && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider mb-1">Ordförande</p>
                <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3] truncate">{data.ordforande}</p>
              </div>
            )}

            {/* Anställda */}
            {data.anstallda !== undefined && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider mb-1">Anställda</p>
                <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3]">{data.anstallda}</p>
              </div>
            )}

            {/* Grundat */}
            {data.startat && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider mb-1">Grundat</p>
                <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3]">{data.startat}</p>
              </div>
            )}

            {/* Stad */}
            {data.stad && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider mb-1">Säte</p>
                <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3] truncate">{data.stad}</p>
              </div>
            )}

            {/* Största ägare */}
            {data.storstAgare && (
              <div className="min-w-0">
                <p className="text-[9px] font-mono text-[#64748b] dark:text-[#8b949e] uppercase tracking-wider mb-1">Största ägare</p>
                <p className="text-sm font-medium text-[#0f172a] dark:text-[#e6edf3] truncate">{data.storstAgare}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#94a3b8] dark:text-[#6e7681] text-center py-4">
            Ingen ytterligare bolagsinformation tillgänglig
          </p>
        )}
      </div>
    </div>
  )
}
