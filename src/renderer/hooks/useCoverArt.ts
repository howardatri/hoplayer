import { useState, useEffect, useRef } from 'react'

// LRU cache with bounded size to prevent unbounded memory growth
const MAX_CACHE_SIZE = 200
const coverCache = new Map<string, string>()

function cacheSet(key: string, value: string) {
  // If key already exists, delete and re-insert to update LRU order
  if (coverCache.has(key)) coverCache.delete(key)
  // Evict oldest entries when cache is full
  while (coverCache.size >= MAX_CACHE_SIZE) {
    const oldest = coverCache.keys().next().value
    const evicted = coverCache.get(oldest)
    coverCache.delete(oldest)
    // Revoke blob URLs on eviction
    if (evicted?.startsWith('blob:')) URL.revokeObjectURL(evicted)
  }
  coverCache.set(key, value)
}

/**
 * Hook to load cover art for a track.
 * Returns a blob URL (or data URL) for the cover image.
 * Handles caching and cleanup with bounded LRU cache.
 */
export function useCoverArt(filePath: string | undefined) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!filePath) {
      setCoverUrl(null)
      return
    }

    // Check cache first
    const cached = coverCache.get(filePath)
    if (cached) {
      setCoverUrl(cached)
      return
    }

    let cancelled = false
    setIsLoading(true)

    window.electronAPI
      .getFileCover(filePath)
      .then((dataUrl) => {
        if (cancelled || !dataUrl) {
          setIsLoading(false)
          return
        }

        cacheSet(filePath, dataUrl)
        setCoverUrl(dataUrl)
        setIsLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [filePath])

  // Cleanup all cached blob URLs on page unload
  useEffect(() => {
    const handleUnload = () => {
      coverCache.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
      coverCache.clear()
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return { coverUrl, isLoading }
}
