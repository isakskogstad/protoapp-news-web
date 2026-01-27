'use client'

import { useState, useEffect } from 'react'
import { Building2, DollarSign, Users, User, Calendar, Crown, Briefcase, Loader2, MapPin, UserCheck } from 'lucide-react'
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-sm font-bold text-black dark:text-white">Bolagsfakta</h3>
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 className="text-sm font-bold text-black dark:text-white">Bolagsfakta</h3>
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
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">VD</p>
                  <p className="text-xs font-medium text-black dark:text-white truncate">{data.vd}</p>
                </div>
              </div>
            )}

            {/* Ordförande */}
            {data.ordforande && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Ordförande</p>
                  <p className="text-xs font-medium text-black dark:text-white truncate">{data.ordforande}</p>
                </div>
              </div>
            )}

            {/* Omsättning */}
            {data.omsattning && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">
                    Omsättning {data.omsattningAr ? `(${data.omsattningAr})` : ''}
                  </p>
                  <p className="text-xs font-medium text-black dark:text-white truncate">{data.omsattning}</p>
                </div>
              </div>
            )}

            {/* Anställda */}
            {data.anstallda !== undefined && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Anställda</p>
                  <p className="text-xs font-medium text-black dark:text-white">{data.anstallda}</p>
                </div>
              </div>
            )}

            {/* Grundat */}
            {data.startat && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Grundat</p>
                  <p className="text-xs font-medium text-black dark:text-white">{data.startat}</p>
                </div>
              </div>
            )}

            {/* Bransch */}
            {data.bransch && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Bransch</p>
                  <p className="text-xs font-medium text-black dark:text-white truncate">{data.bransch}</p>
                </div>
              </div>
            )}

            {/* Stad */}
            {data.stad && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Säte</p>
                  <p className="text-xs font-medium text-black dark:text-white truncate">{data.stad}</p>
                </div>
              </div>
            )}

            {/* Största ägare */}
            {data.storstAgare && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 uppercase">Största ägare</p>
                  <p className="text-xs font-medium text-black dark:text-white truncate">{data.storstAgare}</p>
                </div>
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
