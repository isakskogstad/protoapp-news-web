'use client'

import { Eye, TrendingUp, TrendingDown, Minus, Plus, X, Search } from 'lucide-react'
import { useState, useEffect } from 'react'

export interface WatchedCompany {
  id: string
  name: string
  orgNumber: string
  lastActivity?: string
  activityCount?: number
  status: 'active' | 'quiet' | 'new'
}

const WATCHLIST_KEY = 'loopdesk_watchlist'

function getWatchlist(): WatchedCompany[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(WATCHLIST_KEY)
  return stored ? JSON.parse(stored) : []
}

function addToWatchlist(company: WatchedCompany): void {
  const list = getWatchlist()
  if (!list.find(c => c.id === company.id)) {
    list.push(company)
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list))
  }
}

function removeFromWatchlist(id: string): void {
  const list = getWatchlist().filter(c => c.id !== id)
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list))
}

interface WatchListProps {
  companies?: WatchedCompany[]
  onAddCompany?: () => void
}

export default function WatchList({ companies: propCompanies, onAddCompany }: WatchListProps) {
  const [companies, setCompanies] = useState<WatchedCompany[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WatchedCompany[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (propCompanies) {
      setCompanies(propCompanies)
    } else {
      setCompanies(getWatchlist())
    }
  }, [propCompanies])

  const handleRemove = (id: string) => {
    removeFromWatchlist(id)
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.companies || [])
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      setSearching(false)
    }
  }

  const handleAddCompany = (company: WatchedCompany) => {
    addToWatchlist(company)
    setCompanies(prev => [...prev, company])
    setSearchResults(prev => prev.filter(c => c.id !== company.id))
    setSearchQuery('')
    setShowSearch(false)
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: TrendingUp, color: 'bg-green-50 text-green-700', label: 'Aktiv' }
      case 'quiet':
        return { icon: Minus, color: 'bg-gray-50 text-gray-600', label: 'Lugn' }
      case 'new':
        return { icon: TrendingUp, color: 'bg-blue-50 text-blue-700', label: 'Ny' }
      default:
        return { icon: Minus, color: 'bg-gray-50 text-gray-600', label: '' }
    }
  }

  return (
    <div className="flex flex-col">
      {/* Search mode */}
      {showSearch && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Sök bolag..."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-8 text-xs text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
              autoFocus
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.slice(0, 5).map(company => (
                <button
                  key={company.id}
                  onClick={() => handleAddCompany(company)}
                  className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div>
                    <div className="text-xs font-medium text-black dark:text-white">{company.name}</div>
                    <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{company.orgNumber}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              ))}
            </div>
          )}

          {searching && (
            <div className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">Söker...</div>
          )}
        </div>
      )}

      {/* Company list */}
      {companies.length === 0 && !showSearch ? (
        <div className="py-8 text-center">
          <Eye className="w-6 h-6 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-xs text-gray-400 dark:text-gray-500">Inga bevakade bolag</p>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Lägg till bolag för att följa dem</p>
        </div>
      ) : (
        companies.map((company, index) => {
          const statusInfo = getStatusInfo(company.status)
          const StatusIcon = statusInfo.icon

          return (
            <div
              key={company.id}
              className={`
                flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group
                ${index !== companies.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}
              `}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-black dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                  {company.name}
                </span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{company.orgNumber}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`
                  text-[10px] font-mono font-medium px-2 py-1 rounded-md flex items-center gap-1
                  ${statusInfo.color}
                `}>
                  <StatusIcon className="w-3 h-3" />
                  {company.activityCount ? `${company.activityCount} nya` : statusInfo.label}
                </span>

                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(company.id) }}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Ta bort bevakning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Add button */}
      <button
        onClick={() => setShowSearch(true)}
        className="w-full py-3 text-xs font-mono font-medium text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2"
      >
        <Plus className="w-3 h-3" />
        LÄGG TILL BOLAG
      </button>
    </div>
  )
}
