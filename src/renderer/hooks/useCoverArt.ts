import { useState, useEffect, useRef } from 'react'

const coverCache = new Map<string, string>()

/**
 * Hook to load cover art for a track.
 * Returns a blob URL (or data URL) for the cover image.
 * Handles caching and cleanup.
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

        // dataUrl is already a data: URL from main process
        coverCache.set(filePath, dataUrl)
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
      // Revoke object URL if we created one
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [filePath])

  // Cleanup all cached blob URLs on unmount (page unload)
  useEffect(() => {
    return () => {
      coverCache.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
      coverCache.clear()
    }
  }, [])

  return { coverUrl, isLoading }
}
