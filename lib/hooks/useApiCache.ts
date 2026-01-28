'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface UseApiCacheOptions<T> {
  /** Cache key - should be unique for each API endpoint/query */
  key: string
  /** Function to fetch data */
  fetcher: () => Promise<T>
  /** Cache duration in milliseconds (default: 60 seconds) */
  cacheDuration?: number
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean
  /** Whether to refetch when window gains focus */
  refetchOnFocus?: boolean
  /** Stale time - how long data is considered fresh (default: 30 seconds) */
  staleTime?: number
}

interface UseApiCacheReturn<T> {
  data: T | null
  isLoading: boolean
  isValidating: boolean
  error: Error | null
  refetch: () => Promise<void>
  mutate: (data: T) => void
  invalidate: () => void
}

// Global cache store
const globalCache = new Map<string, CacheEntry<unknown>>()

// Cache event emitter for cross-component updates
type CacheListener = (key: string, data: unknown) => void
const cacheListeners = new Set<CacheListener>()

function emitCacheUpdate(key: string, data: unknown) {
  cacheListeners.forEach(listener => listener(key, data))
}

function subscribeToCacheUpdates(listener: CacheListener): () => void {
  cacheListeners.add(listener)
  return () => {
    cacheListeners.delete(listener)
  }
}

/**
 * Custom hook for API response caching
 * Prevents duplicate requests and provides stale-while-revalidate behavior
 */
export function useApiCache<T>({
  key,
  fetcher,
  cacheDuration = 60_000, // 1 minute default
  fetchOnMount = true,
  refetchOnFocus = false,
  staleTime = 30_000, // 30 seconds default
}: UseApiCacheOptions<T>): UseApiCacheReturn<T> {
  const [data, setData] = useState<T | null>(() => {
    // Initialize from cache if available
    const cached = globalCache.get(key) as CacheEntry<T> | undefined
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(!data)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track if a fetch is in progress to prevent duplicate requests
  const fetchInProgressRef = useRef(false)
  const mountedRef = useRef(true)

  // Fetch function with deduplication
  const fetchData = useCallback(async (options?: { force?: boolean }) => {
    // Prevent duplicate concurrent requests
    if (fetchInProgressRef.current && !options?.force) {
      return
    }

    // Check cache
    const cached = globalCache.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    // If data is fresh (within stale time), don't refetch
    if (!options?.force && cached && now - cached.timestamp < staleTime) {
      if (mountedRef.current) {
        setData(cached.data)
        setIsLoading(false)
      }
      return
    }

    // If we have stale data, use it while revalidating
    if (cached && now < cached.expiresAt) {
      if (mountedRef.current) {
        setData(cached.data)
        setIsLoading(false)
        setIsValidating(true)
      }
    } else {
      if (mountedRef.current) {
        setIsLoading(true)
      }
    }

    fetchInProgressRef.current = true

    try {
      const result = await fetcher()

      // Update cache
      const entry: CacheEntry<T> = {
        data: result,
        timestamp: Date.now(),
        expiresAt: Date.now() + cacheDuration,
      }
      globalCache.set(key, entry)

      if (mountedRef.current) {
        setData(result)
        setError(null)
      }

      // Notify other components using the same cache key
      emitCacheUpdate(key, result)
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Fetch failed'))
      }
    } finally {
      fetchInProgressRef.current = false
      if (mountedRef.current) {
        setIsLoading(false)
        setIsValidating(false)
      }
    }
  }, [key, fetcher, cacheDuration, staleTime])

  // Refetch (force refresh)
  const refetch = useCallback(async () => {
    await fetchData({ force: true })
  }, [fetchData])

  // Manually update cache data
  const mutate = useCallback((newData: T) => {
    const entry: CacheEntry<T> = {
      data: newData,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheDuration,
    }
    globalCache.set(key, entry)
    setData(newData)
    emitCacheUpdate(key, newData)
  }, [key, cacheDuration])

  // Invalidate cache
  const invalidate = useCallback(() => {
    globalCache.delete(key)
    setData(null)
    fetchData({ force: true })
  }, [key, fetchData])

  // Subscribe to cache updates from other components
  useEffect(() => {
    const unsubscribe = subscribeToCacheUpdates((updatedKey, updatedData) => {
      if (updatedKey === key && mountedRef.current) {
        setData(updatedData as T)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [key])

  // Fetch on mount
  useEffect(() => {
    mountedRef.current = true

    if (fetchOnMount) {
      fetchData()
    }

    return () => {
      mountedRef.current = false
    }
  }, [fetchOnMount, fetchData])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) return

    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnFocus, fetchData])

  return {
    data,
    isLoading,
    isValidating,
    error,
    refetch,
    mutate,
    invalidate,
  }
}

/**
 * Utility function to prefetch and cache data
 */
export async function prefetchApiData<T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheDuration: number = 60_000
): Promise<T> {
  const result = await fetcher()

  const entry: CacheEntry<T> = {
    data: result,
    timestamp: Date.now(),
    expiresAt: Date.now() + cacheDuration,
  }
  globalCache.set(key, entry)
  emitCacheUpdate(key, result)

  return result
}

/**
 * Utility function to invalidate all cache entries matching a prefix
 */
export function invalidateCacheByPrefix(prefix: string): void {
  const keysToDelete: string[] = []
  globalCache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => globalCache.delete(key))
}

/**
 * Utility function to clear all cache
 */
export function clearAllCache(): void {
  globalCache.clear()
}

export default useApiCache
