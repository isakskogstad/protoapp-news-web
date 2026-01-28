'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useWatchedCompanies } from '@/lib/hooks/useWatchedCompanies'

interface WatchCompanyButtonProps {
  orgNumber: string
  companyName: string
  className?: string
}

export default function WatchCompanyButton({ orgNumber, companyName, className = '' }: WatchCompanyButtonProps) {
  const { isWatching, toggleWatch } = useWatchedCompanies()
  const watching = isWatching(orgNumber)
  const [animate, setAnimate] = useState(false)

  const handleClick = () => {
    setAnimate(true)
    toggleWatch(orgNumber, companyName)
  }

  // Reset animation after it completes
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimate(false), 300)
      return () => clearTimeout(timer)
    }
  }, [animate])

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
        ${watching
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
        }
        ${animate ? 'scale-95' : 'scale-100'}
        ${className}
      `}
      title={watching ? 'Sluta bevaka detta bolag' : 'Bevaka detta bolag'}
    >
      <span className={`transition-transform duration-200 ${animate ? 'scale-110' : 'scale-100'}`}>
        {watching ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5" />
        )}
      </span>
      <span>{watching ? 'Bevakar' : 'Bevaka'}</span>
    </button>
  )
}
