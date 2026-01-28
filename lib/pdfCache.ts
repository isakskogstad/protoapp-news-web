/**
 * PDF Cache using IndexedDB
 *
 * Caches PDF blobs locally for faster loading and offline access.
 * Cache expires after 7 days.
 */

const DB_NAME = 'protoapp-pdf-cache'
const DB_VERSION = 1
const STORE_NAME = 'pdfs'
const CACHE_EXPIRY_DAYS = 7

interface CachedPDF {
  url: string
  blob: Blob
  cachedAt: number
  size: number
}

interface CacheStats {
  count: number
  totalSize: number
}

let dbInstance: IDBDatabase | null = null

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[PDFCache] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        store.createIndex('cachedAt', 'cachedAt', { unique: false })
      }
    }
  })
}

/**
 * Check if a PDF URL is expired
 */
function isExpired(cachedAt: number): boolean {
  const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - cachedAt > expiryTime
}

/**
 * Get a cached PDF blob by URL
 * Returns null if not cached or expired
 */
export async function getCachedPDF(url: string): Promise<Blob | null> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onerror = () => {
        console.error('[PDFCache] Failed to get cached PDF:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const result = request.result as CachedPDF | undefined

        if (!result) {
          resolve(null)
          return
        }

        // Check if expired
        if (isExpired(result.cachedAt)) {
          // Delete expired entry asynchronously
          deleteCachedPDF(url).catch(console.error)
          resolve(null)
          return
        }

        resolve(result.blob)
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error getting cached PDF:', error)
    return null
  }
}

/**
 * Cache a PDF blob
 */
export async function cachePDF(url: string, blob: Blob): Promise<void> {
  try {
    const db = await initDB()

    const cachedPDF: CachedPDF = {
      url,
      blob,
      cachedAt: Date.now(),
      size: blob.size
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(cachedPDF)

      request.onerror = () => {
        console.error('[PDFCache] Failed to cache PDF:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log(`[PDFCache] Cached PDF: ${url} (${formatSize(blob.size)})`)
        resolve()
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error caching PDF:', error)
    throw error
  }
}

/**
 * Check if a PDF is cached (and not expired)
 */
export async function isCached(url: string): Promise<boolean> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onerror = () => {
        console.error('[PDFCache] Failed to check cache:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const result = request.result as CachedPDF | undefined

        if (!result) {
          resolve(false)
          return
        }

        // Check if expired
        if (isExpired(result.cachedAt)) {
          resolve(false)
          return
        }

        resolve(true)
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error checking cache:', error)
    return false
  }
}

/**
 * Delete a single cached PDF
 */
async function deleteCachedPDF(url: string): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(url)

      request.onerror = () => {
        console.error('[PDFCache] Failed to delete cached PDF:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error deleting cached PDF:', error)
    throw error
  }
}

/**
 * Clear the entire PDF cache
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onerror = () => {
        console.error('[PDFCache] Failed to clear cache:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log('[PDFCache] Cache cleared')
        resolve()
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error clearing cache:', error)
    throw error
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => {
        console.error('[PDFCache] Failed to get cache stats:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const results = request.result as CachedPDF[]
        const now = Date.now()
        const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

        // Only count non-expired entries
        const validEntries = results.filter(entry => now - entry.cachedAt <= expiryTime)

        const stats: CacheStats = {
          count: validEntries.length,
          totalSize: validEntries.reduce((sum, entry) => sum + entry.size, 0)
        }

        resolve(stats)
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error getting cache stats:', error)
    return { count: 0, totalSize: 0 }
  }
}

/**
 * Clean up expired entries
 */
export async function cleanupExpired(): Promise<number> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => {
        console.error('[PDFCache] Failed to cleanup expired:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const results = request.result as CachedPDF[]
        let deletedCount = 0

        const deletePromises = results
          .filter(entry => isExpired(entry.cachedAt))
          .map(entry => {
            deletedCount++
            return new Promise<void>((res, rej) => {
              const deleteRequest = store.delete(entry.url)
              deleteRequest.onsuccess = () => res()
              deleteRequest.onerror = () => rej(deleteRequest.error)
            })
          })

        Promise.all(deletePromises)
          .then(() => {
            if (deletedCount > 0) {
              console.log(`[PDFCache] Cleaned up ${deletedCount} expired entries`)
            }
            resolve(deletedCount)
          })
          .catch(reject)
      }
    })
  } catch (error) {
    console.error('[PDFCache] Error cleaning up expired:', error)
    return 0
  }
}

/**
 * Format bytes to human readable string
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Export formatSize for use in components
 */
export { formatSize }
