'use client'

import { useState, useEffect } from 'react'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'
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

export default function ArsredovisningarModule({ orgNumber, companyName: _companyName }: ArsredovisningarModuleProps) {
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
          <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Årsredovisningar</h3>
        </div>
        <div className="p-8 flex items-center justify-center flex-1">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Årsredovisningar</h3>
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
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.year}</span>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">xhtml</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
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
