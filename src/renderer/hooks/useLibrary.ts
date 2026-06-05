import { useCallback, useEffect } from 'react'
import useLibraryStore from '@/store/libraryStore'
import usePlaylistStore from '@/store/playlistStore'
import usePlayerStore from '@/store/playerStore'
import type { Track } from '@shared/index'

/**
 * Hook for managing the media library.
 * Handles scanning directories, persisting scan paths, and loading saved data.
 */
export function useLibrary() {
  const {
    tracks,
    isLoading,
    scanPaths,
    setTracks,
    addTracks,
    setIsLoading,
    addScanPath,
    removeScanPath,
    setScanPaths
  } = useLibraryStore()

  const setPlaylists = usePlaylistStore((s) => s.setPlaylists)

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedPaths: string[] = await window.electronAPI.storeGet('scanPaths', [])
        const savedTracks: Track[] = await window.electronAPI.storeGet('libraryTracks', [])
        const savedPlaylists = await window.electronAPI.storeGet('playlists', [])

        setScanPaths(savedPaths)
        if (savedTracks.length > 0) {
          setTracks(savedTracks)
        }
        setPlaylists(savedPlaylists)

        // Re-scan saved paths in background to pick up new files
        if (savedPaths.length > 0) {
          for (const path of savedPaths) {
            await scanDirectory(path, false)
          }
        }
      } catch (err) {
        console.error('Failed to load saved data:', err)
      }
    }
    loadSavedData()
  }, [])

  // Persist tracks when they change
  useEffect(() => {
    if (tracks.length > 0) {
      window.electronAPI.storeSet('libraryTracks', tracks).catch(console.error)
    }
  }, [tracks])

  // Persist scan paths when they change
  useEffect(() => {
    window.electronAPI.storeSet('scanPaths', scanPaths).catch(console.error)
  }, [scanPaths])

  // Scan a directory
  const scanDirectory = useCallback(
    async (dirPath: string, isNewScan = true) => {
      if (isNewScan) setIsLoading(true)

      try {
        const result = await window.electronAPI.scanDirectory(dirPath)

        if (isNewScan) {
          addTracks(result.tracks)
          addScanPath(dirPath)
        } else {
          // Background refresh: merge new tracks
          addTracks(result.tracks)
        }

        if (result.errors.length > 0) {
          console.warn('Scan errors:', result.errors)
        }

        return result
      } catch (err) {
        console.error('Scan failed:', err)
        return null
      } finally {
        if (isNewScan) setIsLoading(false)
      }
    },
    [addTracks, addScanPath, setIsLoading]
  )

  // Open directory dialog and scan
  const addDirectory = useCallback(async () => {
    const dirPath = await window.electronAPI.openDirectoryDialog()
    if (!dirPath) return null
    return scanDirectory(dirPath)
  }, [scanDirectory])

  // Remove a scan path and its tracks
  const removeDirectory = useCallback(
    (dirPath: string) => {
      removeScanPath(dirPath)
      // Remove tracks from this directory
      const prefix = dirPath.replace(/\\/g, '/')
      const remaining = tracks.filter((t) => {
        const normalized = t.filePath.replace(/\\/g, '/')
        return !normalized.startsWith(prefix)
      })
      setTracks(remaining)
    },
    [removeScanPath, tracks, setTracks]
  )

  return {
    tracks,
    isLoading,
    scanPaths,
    scanDirectory,
    addDirectory,
    removeDirectory,
    setTracks
  }
}
