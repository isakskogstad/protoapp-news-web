'use client'

import { useState, useEffect, useCallback } from 'react'

export interface WatchedCompany {
  orgNumber: string
  companyName: string
  watchedAt: string
}

const STORAGE_KEY = 'watched_companies'
const MAX_WATCHED = 50

function getStoredCompanies(): WatchedCompany[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.error('Failed to parse watched companies:', e)
    return []
  }
}

function saveCompanies(companies: WatchedCompany[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
}

export interface UseWatchedCompaniesReturn {
  watchedCompanies: WatchedCompany[]
  isWatching: (orgNumber: string) => boolean
  watchCompany: (orgNumber: string, companyName: string) => void
  unwatchCompany: (orgNumber: string) => void
  toggleWatch: (orgNumber: string, companyName: string) => void
}

export function useWatchedCompanies(): UseWatchedCompaniesReturn {
  const [watchedCompanies, setWatchedCompanies] = useState<WatchedCompany[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setWatchedCompanies(getStoredCompanies())
  }, [])

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setWatchedCompanies(getStoredCompanies())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const isWatching = useCallback((orgNumber: string): boolean => {
    return watchedCompanies.some(c => c.orgNumber === orgNumber)
  }, [watchedCompanies])

  const watchCompany = useCallback((orgNumber: string, companyName: string): void => {
    setWatchedCompanies(prev => {
      // Already watching
      if (prev.some(c => c.orgNumber === orgNumber)) {
        return prev
      }

      // Max limit reached - remove oldest
      let newList = [...prev]
      if (newList.length >= MAX_WATCHED) {
        newList = newList.slice(1)
      }

      const newCompany: WatchedCompany = {
        orgNumber,
        companyName,
        watchedAt: new Date().toISOString(),
      }

      const updated = [...newList, newCompany]
      saveCompanies(updated)
      return updated
    })
  }, [])

  const unwatchCompany = useCallback((orgNumber: string): void => {
    setWatchedCompanies(prev => {
      const updated = prev.filter(c => c.orgNumber !== orgNumber)
      saveCompanies(updated)
      return updated
    })
  }, [])

  const toggleWatch = useCallback((orgNumber: string, companyName: string): void => {
    if (isWatching(orgNumber)) {
      unwatchCompany(orgNumber)
    } else {
      watchCompany(orgNumber, companyName)
    }
  }, [isWatching, watchCompany, unwatchCompany])

  return {
    watchedCompanies,
    isWatching,
    watchCompany,
    unwatchCompany,
    toggleWatch,
  }
}
