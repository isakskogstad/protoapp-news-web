'use client'

import { useState, useEffect } from 'react'
import { FileText, ExternalLink, Loader2, Calendar } from 'lucide-react'
import { formatOrgNumber } from '@/lib/utils'

interface ArsredovisningarModuleProps {
  orgNumber: string
  companyName: string
}

interface AnnualReport {
  year: number
  url: string
  exists: boolean
}

const SUPABASE_URL = 'https://rpjmsncjnhtnjnycabys.supabase.co'

export default function ArsredovisningarModule({ orgNumber, companyName }: ArsredovisningarModuleProps) {
  const [reports, setReports] = useState<AnnualReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkReports = async () => {
      // Clean org number (remove dashes)
      const cleanOrg = orgNumber.replace(/-/g, '')
      // Format with dash for filename (XXXXXX-XXXX)
      const formattedOrg = formatOrgNumber(cleanOrg)

      // Check years from current year back to 2018
      const currentYear = new Date().getFullYear()
      const yearsToCheck = Array.from({ length: 7 }, (_, i) => currentYear - 1 - i)

      const reportPromises = yearsToCheck.map(async (year) => {
        const url = `${SUPABASE_URL}/storage/v1/object/public/annual-reports/${cleanOrg}/${formattedOrg}.${year}.xhtml`

        try {
          // Use HEAD request to check if file exists
          const response = await fetch(url, { method: 'HEAD' })
          return {
            year,
            url,
            exists: response.ok
          }
        } catch {
          return {
            year,
            url,
            exists: false
          }
        }
      })

      const results = await Promise.all(reportPromises)
      const existingReports = results.filter(r => r.exists)
      setReports(existingReports)
      setLoading(false)
    }

    checkReports()
  }, [orgNumber])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-black dark:text-white">Årsredovisningar</h3>
        </div>
        <div className="p-8 flex items-center justify-center flex-1">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-black dark:text-white">Årsredovisningar</h3>
      </div>

      <div className="p-4 flex-1">
        {reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map((report) => (
              <a
                key={report.year}
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white">{report.year}</p>
                    <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400">XHTML</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
            Inga årsredovisningar tillgängliga
          </p>
        )}
      </div>
    </div>
  )
}
